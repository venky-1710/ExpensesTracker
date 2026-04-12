"""
Auth routes - Authentication endpoints
"""
from fastapi import APIRouter, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from models.payloads import UserCreate, UserProfileResponse, Token
from apis.auth_api import AuthAPI
from utils.auth import get_current_user
from utils.helpers import api_handler

auth_router = APIRouter()


@auth_router.post("/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
@api_handler
async def signup(payload: UserCreate):
    """Register a new user."""
    return await AuthAPI.signup(payload)


@auth_router.post("/login", response_model=Token)
@api_handler
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user and return JWT token."""
    token_data = await AuthAPI.login(form_data)

    # Set cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token_data['access_token']}",
        httponly=True,
        max_age=60 * 60,  # 1 hour
        secure=True,
        samesite="lax"
    )

    return token_data


@auth_router.get("/me", response_model=UserProfileResponse)
@api_handler
async def read_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return UserProfileResponse(**current_user)
