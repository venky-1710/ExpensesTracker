"""
User API - User profile management business logic and database queries.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from database.database import db
from utils.auth import get_password_hash, verify_password
from utils.helpers import format_user_doc
from utils.logger import logger
from models.payloads import UserProfileUpdate, PasswordChange, UserPreferences
from typing import Dict, Any, Optional
import traceback
import base64


class UserAPI:
    """User profile business logic with inline MongoDB queries."""

    @staticmethod
    async def get_user_by_id(user_id: str, include_password: bool = False) -> Optional[Dict[str, Any]]:
        """Get user by ID from database."""
        try:
            user = await db.auth_users.find_one({"_id": ObjectId(user_id), "is_deleted": {"$ne": True}})
            if user:
                return format_user_doc(user, strip_password=not include_password)
            return None
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.get_user_by_id - user_id={user_id}: {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return None

    @staticmethod
    async def get_profile(user_id: str) -> Dict[str, Any]:
        """Get user profile by ID."""
        try:
            logger.info(f"[USER] Getting profile for user_id: {user_id}")
            user = await UserAPI.get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.get_profile - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def update_profile(user_id: str, update_data: UserProfileUpdate) -> Dict[str, Any]:
        """Update user profile."""
        try:
            logger.info(f"[USER] Updating profile for user_id: {user_id}")
            update_dict = update_data.model_dump(exclude_unset=True)

            if not update_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )

            # Validate profile image if provided
            if "profile_image" in update_dict and update_dict["profile_image"]:
                UserAPI._validate_base64_image(update_dict["profile_image"])

            # Validate banner image if provided
            if "banner_image" in update_dict and update_dict["banner_image"]:
                UserAPI._validate_base64_image(update_dict["banner_image"])

            update_dict["updated_at"] = datetime.now()

            result = await db.auth_users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_dict}
            )

            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            updated_user = await UserAPI.get_user_by_id(user_id)
            logger.info(f"[USER] Profile updated successfully for user_id: {user_id}")
            return updated_user

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.update_profile - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def change_password(user_id: str, password_data: PasswordChange) -> Dict[str, str]:
        """Change user password."""
        try:
            logger.info(f"[USER] Password change request for user_id: {user_id}")

            user = await UserAPI.get_user_by_id(user_id, include_password=True)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            if password_data.old_password:
                if not verify_password(password_data.old_password, user["password_hash"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Incorrect old password"
                    )

            new_hash = get_password_hash(password_data.new_password)

            await db.auth_users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "password_hash": new_hash,
                    "updated_at": datetime.now()
                }}
            )

            logger.info(f"[USER] Password changed successfully for user_id: {user_id}")
            return {"message": "Password changed successfully"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.change_password - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def update_preferences(user_id: str, preferences: UserPreferences) -> Dict[str, Any]:
        """Update user preferences (theme, currency)."""
        try:
            logger.info(f"[USER] Updating preferences for user_id: {user_id}")
            update_dict = preferences.model_dump(exclude_unset=True)

            if not update_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No preferences to update"
                )

            update_dict["updated_at"] = datetime.now()

            result = await db.auth_users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_dict}
            )

            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            updated_user = await UserAPI.get_user_by_id(user_id)
            logger.info(f"[USER] Preferences updated for user_id: {user_id}")
            return updated_user

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.update_preferences - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def hard_delete(user_id: str, password: str) -> Dict[str, str]:
        """Permanently delete user account and all associated data after password verification."""
        try:
            logger.info(f"[USER] Hard delete request for user_id: {user_id}")

            # Verify password before deleting
            user = await UserAPI.get_user_by_id(user_id, include_password=True)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            if not verify_password(password, user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect password"
                )

            user_oid = ObjectId(user_id)

            # Delete all transactions
            tx_result = await db.transactions.delete_many({"user_id": user_oid})
            logger.info(f"[USER] Deleted {tx_result.deleted_count} transactions for user_id: {user_id}")

            # Delete all calendar events
            cal_result = await db.calendar_events.delete_many({"user_id": user_oid})
            logger.info(f"[USER] Deleted {cal_result.deleted_count} calendar events for user_id: {user_id}")

            # Hard delete the user document
            result = await db.auth_users.delete_one({"_id": user_oid})

            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            logger.info(f"[USER] Account permanently deleted for user_id: {user_id}")
            return {"message": "Account and all data permanently deleted"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI.hard_delete - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def _validate_base64_image(base64_string: str):
        """Validate base64 image (size and format)."""
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
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] UserAPI._validate_base64_image - {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format"
            )
