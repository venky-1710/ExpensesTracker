from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from database.database import db
from models.user_model import UserCreate, UserProfileResponse, Token
from utils.auth import *
from utils.logger import logger
import traceback

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate, request: Request):
    """Register a new user"""
    try:
        logger.info(f"📝 Signup attempt for email: {payload.email}")
        logger.debug(f"Signup payload: full_name={payload.full_name}, username={payload.username}, email={payload.email}, phone={payload.phone}")
        
        # Check if user exists (by email or username)
        existing_email = await db["auth_users"].find_one({"email": payload.email})
        if existing_email:
            logger.warning(f"⚠️ Signup failed: Email {payload.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )
        
        # Check if username already exists (case-insensitive)
        existing_username = await db["auth_users"].find_one({
            "username": {"$regex": f"^{payload.username}$", "$options": "i"}
        })
        if existing_username:
            logger.warning(f"⚠️ Signup failed: Username {payload.username} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )


        logger.debug("Hashing password...")
        hashed_password = get_password_hash(payload.password)

        doc = {
            "full_name": payload.full_name,
            "username": payload.username,
            "email": payload.email,
            "password_hash": hashed_password,
            "phone": payload.phone,
            "profile_image": None,
            "role": "user",
            "currency_preference": "USD",
            "theme_preference": "light",
            "is_deleted": False,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }

        logger.debug("Inserting user into database...")
        result = await db["auth_users"].insert_one(doc)
        
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        doc.pop("password_hash", None)
        
        logger.info(f"✅ User created successfully: {payload.email} (ID: {doc['id']})")
        return UserProfileResponse(**doc)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Signup error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )



@auth_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None):
    """Login user and return JWT token"""
    try:
        logger.info(f"🔐 Login attempt for: {form_data.username}")
        
        # Get user by email
        logger.debug("Fetching user from database...")
        user = await get_user_by_email(form_data.username)
        
        if not user:
            logger.warning(f"⚠️ Login failed: User not found - {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Incorrect email or password"
            )
        
        logger.debug(f"User found: {user.get('email')} (ID: {user.get('id')})")
        
        # Verify password
        logger.debug("Verifying password...")
        if not verify_password(form_data.password, user["password_hash"]):
            logger.warning(f"⚠️ Login failed: Incorrect password for {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Incorrect email or password"
            )

        logger.debug("Creating access token...")
        access_token = create_access_token(data={"sub": user["id"]})
        
        logger.info(f"✅ Login successful: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@auth_router.get("/me", response_model=UserProfileResponse)
async def read_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    try:
        logger.info(f"📋 Profile request for user: {current_user.get('email')}")
        return UserProfileResponse(**current_user)
    except Exception as e:
        logger.error(f"❌ Get profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )

