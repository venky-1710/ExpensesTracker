"""
Timesheet API - Business logic and database queries for timesheets.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from database.database import db
from utils.helpers import format_transaction_doc
from utils.logger import logger
from models.payloads import TimesheetCreate, TimesheetUpdate
from typing import List, Dict, Any

class TimesheetAPI:
    """Timesheet business logic with MongoDB queries."""

    @staticmethod
    async def create_timesheet(user_id: str, timesheet_data: TimesheetCreate) -> Dict[str, Any]:
        """Create a new timesheet."""
        try:
            logger.info(f"[TIMESHEET] Creating timesheet for user_id: {user_id}")
            doc = timesheet_data.dict()
            doc["user_id"] = ObjectId(user_id)
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()
            
            result = await db.timesheets.insert_one(doc)
            doc["_id"] = result.inserted_id
            return format_transaction_doc(doc)
        except Exception as e:
            logger.error(f"[TIMESHEET] Error creating timesheet: {e}")
            raise HTTPException(status_code=500, detail="Failed to create timesheet")

    @staticmethod
    async def get_timesheets(user_id: str, start_date: str = None, end_date: str = None, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Get all timesheets for a user with pagination."""
        try:
            query = {"user_id": ObjectId(user_id)}
            if start_date or end_date:
                date_query_str = {}
                date_query_dt = {}
                
                # Parse to datetime for ISODate query fallback
                start_dt = None
                end_dt = None
                try:
                    if start_date: start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    if end_date: end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                except ValueError:
                    pass

                if start_date:
                    date_query_str["$gte"] = start_date
                    if start_dt: date_query_dt["$gte"] = start_dt
                if end_date:
                    date_query_str["$lte"] = end_date
                    if end_dt: date_query_dt["$lte"] = end_dt

                if date_query_str:
                    query["$or"] = [
                        {"date": date_query_str},
                        {"date": date_query_dt}
                    ]

            total_count = await db.timesheets.count_documents(query)
            skip = (page - 1) * limit

            cursor = db.timesheets.find(query).sort("date", -1).skip(skip).limit(limit)
            timesheets = await cursor.to_list(length=limit)
            
            return {
                "timesheets": [format_transaction_doc(doc) for doc in timesheets],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "has_more": skip + len(timesheets) < total_count
                }
            }
        except Exception as e:
            logger.error(f"[TIMESHEET] Error fetching timesheets: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch timesheets")

    @staticmethod
    async def update_timesheet(user_id: str, timesheet_id: str, update_data: TimesheetUpdate) -> Dict[str, Any]:
        """Update a timesheet."""
        try:
            update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
            if not update_dict:
                raise HTTPException(status_code=400, detail="No valid fields to update")
            
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await db.timesheets.find_one_and_update(
                {"_id": ObjectId(timesheet_id), "user_id": ObjectId(user_id)},
                {"$set": update_dict},
                return_document=True
            )
            
            if not result:
                raise HTTPException(status_code=404, detail="Timesheet not found")
                
            return format_transaction_doc(result)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[TIMESHEET] Error updating timesheet: {e}")
            raise HTTPException(status_code=500, detail="Failed to update timesheet")

    @staticmethod
    async def delete_timesheet(user_id: str, timesheet_id: str) -> dict:
        """Delete a timesheet."""
        try:
            result = await db.timesheets.delete_one(
                {"_id": ObjectId(timesheet_id), "user_id": ObjectId(user_id)}
            )
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Timesheet not found")
                
            return {"message": "Timesheet deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[TIMESHEET] Error deleting timesheet: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete timesheet")
