"""
Timesheet Routes - API endpoints for timesheet management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from models.payloads import APIResponse, TimesheetCreate, TimesheetUpdate
from apis.timesheet_api import TimesheetAPI
from routes.auth_routes import get_current_user

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])

@router.post("", response_model=APIResponse)
async def create_timesheet(
    timesheet_data: TimesheetCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new timesheet."""
    try:
        user_id = str(current_user["id"])
        new_timesheet = await TimesheetAPI.create_timesheet(user_id, timesheet_data)
        return APIResponse(
            success=True,
            data={"timesheet": new_timesheet}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=APIResponse)
async def get_timesheets(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get timesheets for the authenticated user, optionally filtered by date."""
    try:
        user_id = str(current_user["id"])
        result = await TimesheetAPI.get_timesheets(user_id, start_date, end_date, page, limit)
        return APIResponse(
            success=True,
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{timesheet_id}", response_model=APIResponse)
async def update_timesheet(
    timesheet_id: str,
    update_data: TimesheetUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a timesheet."""
    try:
        user_id = str(current_user["id"])
        updated = await TimesheetAPI.update_timesheet(user_id, timesheet_id, update_data)
        return APIResponse(
            success=True,
            data={"timesheet": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{timesheet_id}", response_model=APIResponse)
async def delete_timesheet(
    timesheet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a timesheet."""
    try:
        user_id = str(current_user["id"])
        result = await TimesheetAPI.delete_timesheet(user_id, timesheet_id)
        return APIResponse(
            success=True,
            data=None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
