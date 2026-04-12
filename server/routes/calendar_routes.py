from fastapi import APIRouter, Depends, HTTPException
from typing import List
from utils.auth import get_current_user
from models.payloads import UserInDB, CalendarEventRequest, CalendarEventUpdate, CalendarEventResponse
from apis.calendar_api import get_user_events, create_user_event, update_user_event, delete_user_event
from apis.cache_api import cache_service
from utils.helpers import api_handler
from utils.cache import cached

router = APIRouter()

@router.get("", response_model=List[CalendarEventResponse])
@cached(ttl_seconds=120)
@api_handler
async def get_events(current_user: UserInDB = Depends(get_current_user)):
    """Get all calendar events for the user"""
    events = await get_user_events(str(current_user["id"]))
    return events

@router.post("", response_model=CalendarEventResponse)
@api_handler
async def create_event(
    request: CalendarEventRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new calendar event"""
    event = await create_user_event(str(current_user["id"]), request.model_dump())
    if not event:
        raise HTTPException(status_code=500, detail="Failed to create event")
    cache_service.invalidate_user_cache(str(current_user["id"]))
    return event

@router.put("/{event_id}", response_model=CalendarEventResponse)
@api_handler
async def update_event(
    event_id: str,
    request: CalendarEventUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a calendar event including dates via drag & drop"""
    updated = await update_user_event(str(current_user["id"]), event_id, request.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found or failed to update")
    cache_service.invalidate_user_cache(str(current_user["id"]))
    return updated

@router.delete("/{event_id}")
@api_handler
async def delete_event(
    event_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a calendar event"""
    success = await delete_user_event(str(current_user["id"]), event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    cache_service.invalidate_user_cache(str(current_user["id"]))
    return {"success": True, "message": "Event deleted successfully"}
