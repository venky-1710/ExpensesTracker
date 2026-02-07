"""
User routes - Profile management endpoints
"""
from fastapi import APIRouter, Depends, status, HTTPException
from models.user_model import (
    UserProfileResponse,
    UserProfileUpdate,
    PasswordChange,
    UserPreferences
)
from models.response_model import APIResponse
from services.user_service import UserService
from utils.auth import get_current_user
from utils.logger import logger
import traceback

user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's full profile"""
    try:
        logger.info(f"📋 Get profile: {current_user.get('email')}")
        return UserProfileResponse(**current_user)
    except Exception as e:
        logger.error(f"❌ Get profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@user_router.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        logger.info(f"✏️ Update profile: {current_user.get('email')}")
        updated_user = await UserService.update_profile(current_user["id"], update_data)
        logger.info(f"✅ Profile updated successfully")
        return UserProfileResponse(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update profile error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@user_router.put("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    try:
        logger.info(f"🔑 Password change request: {current_user.get('email')}")
        result = await UserService.change_password(current_user["id"], password_data)
        logger.info(f"✅ Password changed successfully")
        return APIResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Password change error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@user_router.put("/preferences", response_model=UserProfileResponse)
async def update_preferences(
    preferences: UserPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences (theme, currency)"""
    try:
        logger.info(f"⚙️ Update preferences: {current_user.get('email')}")
        updated_user = await UserService.update_preferences(current_user["id"], preferences)
        logger.info(f"✅ Preferences updated")
        return UserProfileResponse(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update preferences error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@user_router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """Soft delete user account"""
    try:
        logger.info(f"🗑️ Delete account request: {current_user.get('email')}")
        result = await UserService.soft_delete(current_user["id"])
        logger.info(f"✅ Account deleted")
        return APIResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete account error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


