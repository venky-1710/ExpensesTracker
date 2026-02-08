"""
User database queries
"""
from database.database import db
from bson import ObjectId
from typing import Dict, Any, Optional
from datetime import datetime

async def get_user_by_id_query(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    user = await db.auth_users.find_one({"_id": ObjectId(user_id), "is_deleted": False})
    if user:
        user["id"] = str(user.pop("_id"))
    return user

async def get_user_by_email_query(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    user = await db.auth_users.find_one({"email": email})
    if user:
        user["id"] = str(user.pop("_id"))
    return user

async def get_user_by_username_query(username: str) -> Optional[Dict[str, Any]]:
    """Get user by username (case insensitive regex search recommended in service, simplified here)"""
    # This might need regex passing from service if strictest check is needed there
    # But for direct match:
    user = await db.auth_users.find_one({"username": username})
    if user:
        user["id"] = str(user.pop("_id"))
    return user

async def create_user_query(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new user"""
    result = await db.auth_users.insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    user_data.pop("_id", None)
    return user_data

async def update_user_query(user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update user data"""
    result = await db.auth_users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return None
    
    return await get_user_by_id_query(user_id)

async def soft_delete_user_query(user_id: str) -> bool:
    """Soft delete user"""
    result = await db.auth_users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "is_deleted": True,
            "updated_at": datetime.now()
        }}
    )
    return result.matched_count > 0
