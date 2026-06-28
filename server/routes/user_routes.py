"""
User routes - Profile management endpoints
"""
from fastapi import APIRouter, Depends, status
from models.payloads import (
    UserProfileResponse,
    UserProfileUpdate,
    PasswordChange,
    UserPreferences,
    DeleteAccountRequest,
    APIResponse
)
from apis.user_api import UserAPI
from utils.auth import get_current_user
from utils.helpers import api_handler

user_router = APIRouter()


@user_router.get("/me", response_model=UserProfileResponse)
@api_handler
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's full profile."""
    return UserProfileResponse(**current_user)


@user_router.put("/me", response_model=UserProfileResponse)
@api_handler
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile."""
    updated_user = await UserAPI.update_profile(current_user["id"], update_data)
    return UserProfileResponse(**updated_user)


@user_router.put("/change-password")
@api_handler
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password."""
    result = await UserAPI.change_password(current_user["id"], password_data)
    return APIResponse(success=True, data=result)


@user_router.put("/preferences", response_model=UserProfileResponse)
@api_handler
async def update_preferences(
    preferences: UserPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences (theme, currency)."""
    updated_user = await UserAPI.update_preferences(current_user["id"], preferences)
    return UserProfileResponse(**updated_user)


@user_router.delete("/me", status_code=status.HTTP_200_OK)
@api_handler
async def delete_my_account(
    body: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    """Permanently delete user account and all associated data."""
    result = await UserAPI.hard_delete(current_user["id"], body.password)
    return APIResponse(success=True, data=result)
