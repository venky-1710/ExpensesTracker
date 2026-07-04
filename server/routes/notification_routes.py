from fastapi import APIRouter, Depends, HTTPException
from typing import List
from utils.auth import get_current_user
from models.payloads import UserInDB, NotificationResponse
from apis.notification_api import get_user_notifications, mark_notification_read, mark_all_notifications_read, clear_all_notifications, delete_notification
from utils.helpers import api_handler

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
@api_handler
async def get_notifications(current_user: UserInDB = Depends(get_current_user)):
    """Get all notifications for the user"""
    notifications = await get_user_notifications(str(current_user["id"]))
    return notifications

@router.put("/read-all")
@api_handler
async def mark_all_read(current_user: UserInDB = Depends(get_current_user)):
    """Mark all notifications as read"""
    modified_count = await mark_all_notifications_read(str(current_user["id"]))
    return {"success": True, "message": f"{modified_count} notifications marked as read"}

@router.put("/{notification_id}/read")
@api_handler
async def mark_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Mark a notification as read"""
    success = await mark_notification_read(str(current_user["id"]), notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification marked as read"}

@router.delete("")
@api_handler
async def clear_notifications(current_user: UserInDB = Depends(get_current_user)):
    """Clear all notifications for the user"""
    deleted_count = await clear_all_notifications(str(current_user["id"]))
    return {"success": True, "message": f"{deleted_count} notifications cleared"}

@router.delete("/{notification_id}")
@api_handler
async def delete_notif(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a specific notification"""
    success = await delete_notification(str(current_user["id"]), notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification deleted"}
