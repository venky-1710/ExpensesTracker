"""
Auth API - Authentication business logic and database queries.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
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
    async def signup(payload: UserCreate) -> Dict[str, Any]:
        """Register a new user."""
        try:
            logger.info(f"[AUTH] Signup attempt for email: {payload.email}")

            # Check if email already exists
            existing_email = await db.auth_users.find_one({"email": payload.email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )

            # Check if username already exists
            existing_username = await db.auth_users.find_one({"username": payload.username})
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )

            hashed_password = get_password_hash(payload.password)

            user_doc = {
                "full_name": payload.full_name,
                "username": payload.username,
                "email": payload.email,
                "password_hash": hashed_password,
                "phone": payload.phone,
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

            logger.info(f"[AUTH] Signup successful for email: {payload.email}")
            return user_doc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] AuthAPI.signup - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Signup failed: {str(e)}"
            )

    @staticmethod
    async def login(form_data) -> Dict[str, str]:
        """Login user and return JWT token."""
        try:
            logger.info(f"[AUTH] Login attempt for: {form_data.username}")

            # Find user by email (using email as username field in OAuth2 form)
            user = await db.auth_users.find_one({"email": form_data.username})
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
