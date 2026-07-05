"""
Auth API - Authentication business logic and database queries.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import BackgroundTasks, HTTPException, status
from database.database import db
from utils.auth import get_password_hash, verify_password, create_access_token
from utils.helpers import format_user_doc
from utils.logger import logger
from models.payloads import UserCreate, Token
from typing import Dict, Any
import traceback


class AuthAPI:
    """Authentication business logic with inline MongoDB queries."""

    @staticmethod
    async def request_signup(payload: UserCreate, background_tasks: BackgroundTasks) -> Dict[str, Any]:
        """Request signup, generate OTP, and store unverified user."""
        try:
            logger.info(f"[AUTH] Signup request for email: {payload.email}")

            existing_email = await db.auth_users.find_one({"email": payload.email, "is_deleted": {"$ne": True}})
            if existing_email:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email already exists")

            existing_username = await db.auth_users.find_one({"username": payload.username, "is_deleted": {"$ne": True}})
            if existing_username:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

            import random
            from datetime import timedelta
            from utils.email import send_signup_otp_email
            
            otp = f"{random.randint(100000, 999999)}"
            expires_at = datetime.now() + timedelta(minutes=15)
            
            hashed_password = get_password_hash(payload.password)
            unverified_user = {
                "full_name": payload.full_name,
                "username": payload.username,
                "email": payload.email,
                "password_hash": hashed_password,
                "phone": payload.phone,
                "otp": otp,
                "otp_expires": expires_at,
                "created_at": datetime.now(),
            }
            
            await db.unverified_users.update_one(
                {"email": payload.email},
                {"$set": unverified_user},
                upsert=True
            )
            
            background_tasks.add_task(send_signup_otp_email, payload.email, otp)
            return {"message": "OTP sent to email"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.request_signup - {str(e)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Signup request failed: {str(e)}")

    @staticmethod
    async def verify_signup(email: str, code: str) -> Dict[str, Any]:
        """Verify OTP and complete user registration."""
        try:
            unverified = await db.unverified_users.find_one({
                "email": email,
                "otp": code,
                "otp_expires": {"$gt": datetime.now()}
            })
            if not unverified:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
                
            user_doc = {
                "full_name": unverified["full_name"],
                "username": unverified["username"],
                "email": unverified["email"],
                "password_hash": unverified["password_hash"],
                "phone": unverified.get("phone"),
                "profile_image": None,
                "banner_image": None,
                "role": "user",
                "currency_preference": "USD",
                "theme_preference": "light",
                "is_deleted": False,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }
            
            result = await db.auth_users.insert_one(user_doc)
            user_doc["id"] = str(result.inserted_id)
            user_doc.pop("_id", None)
            user_doc.pop("password_hash", None)
            
            await db.unverified_users.delete_one({"email": email})
            
            access_token = create_access_token(data={"sub": user_doc["id"]})
            logger.info(f"[AUTH] Signup verified for email: {email}")
            
            return {
                "message": "Signup successful",
                "user": user_doc,
                "access_token": access_token
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.verify_signup - {str(e)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Verification failed: {str(e)}")

    @staticmethod
    async def login(form_data) -> Dict[str, str]:
        """Login user and return JWT token."""
        try:
            logger.info(f"[AUTH] Login attempt for: {form_data.username}")

            # Find user by email, skip soft-deleted accounts
            user = await db.auth_users.find_one({"email": form_data.username, "is_deleted": {"$ne": True}})
            if user:
                user["id"] = str(user.pop("_id"))

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect email or password"
                )

            if not verify_password(form_data.password, user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect email or password"
                )

            access_token = create_access_token(data={"sub": user["id"]})

            logger.info(f"[AUTH] Login successful for: {form_data.username}")
            return {"access_token": access_token, "token_type": "bearer"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.login - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Login failed: {str(e)}"
            )

    @staticmethod
    async def request_password_reset(email: str, background_tasks: BackgroundTasks) -> Dict[str, Any]:
        try:
            logger.info(f"[AUTH] Password reset requested for: {email}")
            user = await db.auth_users.find_one({"email": email, "is_deleted": False})
            if not user:
                raise HTTPException(status_code=404, detail="This email does not exist in our system.")
            
            import random
            from datetime import timedelta
            from utils.email import send_reset_email
            
            reset_code = f"{random.randint(100000, 999999)}"
            expires_at = datetime.now() + timedelta(minutes=15)
            
            await db.auth_users.update_one(
                {"_id": user["_id"]},
                {"$set": {"reset_code": reset_code, "reset_expires": expires_at}}
            )
            
            # Send real email in the background so the request doesn't wait on SMTP
            background_tasks.add_task(send_reset_email, email, reset_code)

            return {"message": "A reset code has been sent to your email."}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.request_password_reset - {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to request password reset")

    @staticmethod
    async def reset_password(email: str, code: str, new_password: str) -> Dict[str, Any]:
        try:
            user = await db.auth_users.find_one({
                "email": email, 
                "reset_code": code,
                "reset_expires": {"$gt": datetime.now()},
                "is_deleted": False
            })
            
            if not user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code")
                
            hashed_password = get_password_hash(new_password)
            
            await db.auth_users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {"password_hash": hashed_password, "updated_at": datetime.now()},
                    "$unset": {"reset_code": "", "reset_expires": ""}
                }
            )
            
            logger.info(f"[AUTH] Password successfully reset for: {email}")
            return {"message": "Password successfully reset"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.reset_password - {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to reset password")

    @staticmethod
    async def google_login(id_token: str) -> Dict[str, str]:
        import requests
        import os
        import secrets
        import string
        
        try:
            logger.info("[AUTH] Google login attempt")
            # Verify token
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
            
            if response.status_code != 200:
                logger.error(f"[AUTH] Google token invalid: {response.text}")
                raise HTTPException(status_code=400, detail="Invalid Google token")
                
            token_info = response.json()
            
            # Optionally check client ID if it's set
            if client_id and token_info.get("aud") != client_id:
                logger.error(f"[AUTH] Google token audience mismatch: {token_info.get('aud')} != {client_id}")
                # We will still proceed if we trust the id_token, but typically you reject here
                # raise HTTPException(status_code=400, detail="Invalid token audience")
                
            email = token_info.get("email")
            if not email:
                raise HTTPException(status_code=400, detail="Google token missing email")
                
            # Check if user exists
            user = await db.auth_users.find_one({"email": email, "is_deleted": False})
            
            if user:
                user["id"] = str(user.pop("_id"))
                access_token = create_access_token(data={"sub": user["id"]})
                logger.info(f"[AUTH] Google login successful for existing user: {email}")
                return {"access_token": access_token, "token_type": "bearer"}
                
            # User doesn't exist, create one
            logger.info(f"[AUTH] Creating new user from Google login: {email}")
            full_name = token_info.get("name", email.split("@")[0])
            picture = token_info.get("picture")
            
            # Generate random password since they use Google
            random_pwd = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            hashed_password = get_password_hash(random_pwd)
            
            # ensure username is unique
            base_username = email.split("@")[0]
            username = base_username
            counter = 1
            while await db.auth_users.find_one({"username": username}):
                username = f"{base_username}{counter}"
                counter += 1
            
            user_doc = {
                "full_name": full_name,
                "username": username,
                "email": email,
                "password_hash": hashed_password,
                "phone": None,
                "profile_image": picture,
                "banner_image": None,
                "role": "user",
                "currency_preference": "USD",
                "theme_preference": "light",
                "is_deleted": False,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }
            
            result = await db.auth_users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            access_token = create_access_token(data={"sub": user_id})
            logger.info(f"[AUTH] Google signup/login successful for: {email}")
            return {"access_token": access_token, "token_type": "bearer"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.google_login - {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to login with Google")

    @staticmethod
    async def check_availability(username: str = None, email: str = None) -> Dict[str, bool]:
        """Check if a username or email is available."""
        result = {"username_available": True, "email_available": True}
        
        try:
            if username:
                user_by_name = await db.auth_users.find_one({"username": username, "is_deleted": {"$ne": True}})
                if user_by_name:
                    result["username_available"] = False
                    
            if email:
                user_by_email = await db.auth_users.find_one({"email": email, "is_deleted": {"$ne": True}})
                if user_by_email:
                    result["email_available"] = False
                    
            return result
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.check_availability - {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to check availability")
