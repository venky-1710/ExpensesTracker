from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from models.payloads import UserCreate, UserProfileResponse, Token
from services.auth_service import AuthService
from utils.auth import get_current_user
from utils.logger import logger
import traceback


auth_router = APIRouter()

@auth_router.post("/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate, request: Request):
    """Register a new user"""
    try:
        logger.info(f"📝 Signup attempt for email: {payload.email}")
        return await AuthService.signup(payload)
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
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None):
    """Login user and return JWT token"""
    try:
        logger.info(f"🔐 Login attempt for: {form_data.username}")
        
        token_data = await AuthService.login(form_data)
        
        # Set cookie
        response.set_cookie(
            key="access_token",
            value=f"Bearer {token_data['access_token']}",
            httponly=True,
            max_age=60 * 60, # 1 hour
            secure=True, # Set to True in production (requires HTTPS)
            samesite="lax"
        )
        
        logger.info(f"✅ Login successful: {form_data.username}")
        return token_data
        
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

