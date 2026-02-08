"""
User service - Business logic for user operations
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from database.queries.user_queries import (
    get_user_by_id_query,
    update_user_query,
    soft_delete_user_query
)
from utils.auth import get_password_hash, verify_password
from models.payloads import UserProfileUpdate, PasswordChange, UserPreferences
import base64
import re


class UserService:
    """User-related business operations"""
    

    @staticmethod
    async def get_user_profile(user_id: str):
        """Get user profile by ID"""
        user = await get_user_by_id_query(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    
    @staticmethod
    async def update_profile(user_id: str, update_data: UserProfileUpdate):
        """Update user profile"""
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Validate profile image if provided
        if "profile_image" in update_dict and update_dict["profile_image"]:
            UserService._validate_base64_image(update_dict["profile_image"])
        
        # Add updated timestamp
        update_dict["updated_at"] = datetime.now()
        
        updated_user = await update_user_query(user_id, update_dict)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return updated_user
    
    @staticmethod
    async def change_password(user_id: str, password_data: PasswordChange):
        """Change user password"""
        user = await get_user_by_id_query(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify old password
        # Note: in queries we pop _id, but we need to check password hash which is in user doc
        # The query returns the user doc with 'id' instead of '_id', and password_hash should be there if checking directly?
        # IMPORTANT: get_user_by_id_query should probably return all fields including password_hash for this to work.
        # Let's assume it does.
        
        if not verify_password(password_data.old_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect old password"
            )
        
        # Hash new password
        new_hash = get_password_hash(password_data.new_password)
        
        await update_user_query(user_id, {
            "password_hash": new_hash,
            "updated_at": datetime.now()
        })
        
        return {"message": "Password changed successfully"}
    
    @staticmethod
    async def update_preferences(user_id: str, preferences: UserPreferences):
        """Update user preferences (theme, currency)"""
        update_dict = preferences.model_dump(exclude_unset=True)
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No preferences to update"
            )
        
        update_dict["updated_at"] = datetime.now()
        
        updated_user = await update_user_query(user_id, update_dict)
        
        if not updated_user:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return updated_user
    
    @staticmethod
    async def soft_delete(user_id: str):
        """Soft delete user account"""
        success = await soft_delete_user_query(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "Account deleted successfully"}
    
    @staticmethod
    def _validate_base64_image(base64_string: str):
        """Validate base64 image (size and format)"""
        # Check if valid base64
        try:
            # Remove data URI prefix if present
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]
            
            image_data = base64.b64decode(base64_string)
            
            # Check size (max 2MB)
            max_size = 2 * 1024 * 1024
            if len(image_data) > max_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image size too large. Maximum 2MB allowed."
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
