"""
Auth routes - Authentication endpoints
"""
from fastapi import APIRouter, BackgroundTasks, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from models.payloads import UserCreate, UserProfileResponse, Token, PasswordResetRequest, PasswordResetConfirm, GoogleLoginRequest, VerifySignupRequest
from apis.auth_api import AuthAPI
from utils.auth import get_current_user
from utils.helpers import api_handler

auth_router = APIRouter()


@auth_router.post("/request-signup")
@api_handler
async def request_signup(payload: UserCreate, background_tasks: BackgroundTasks):
    """Request a new user registration (sends OTP)."""
    return await AuthAPI.request_signup(payload, background_tasks)

@auth_router.post("/verify-signup")
@api_handler
async def verify_signup(payload: VerifySignupRequest):
    """Verify OTP and complete user registration."""
    return await AuthAPI.verify_signup(payload.email, payload.code)


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


@auth_router.post("/forgot-password")
@api_handler
async def forgot_password(payload: PasswordResetRequest, background_tasks: BackgroundTasks):
    """Request a password reset link/code."""
    result = await AuthAPI.request_password_reset(payload.email, background_tasks)
    return result


@auth_router.post("/reset-password")
@api_handler
async def reset_password(payload: PasswordResetConfirm):
    """Confirm password reset with code."""
    result = await AuthAPI.reset_password(payload.email, payload.code, payload.new_password)
    return result

@auth_router.get("/check-availability")
@api_handler
async def check_availability(username: str = None, email: str = None):
    """Check if username or email is available for registration."""
    return await AuthAPI.check_availability(username, email)

@auth_router.post("/google", response_model=Token)
@api_handler
async def google_login(payload: GoogleLoginRequest, response: Response):
    """Login with Google id_token."""
    token_data = await AuthAPI.google_login(payload.id_token)
    
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
