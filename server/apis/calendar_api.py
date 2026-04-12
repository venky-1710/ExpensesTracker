from database.database import db
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def get_user_events(user_id: str) -> list:
    """Fetch all calendar events for a user."""
    try:
        cursor = db.calendar_events.find({"user_id": ObjectId(user_id)}).sort("start_time", 1)
        events = await cursor.to_list(length=1000)
        formatted_events = []
        for e in events:
            e["id"] = str(e.pop("_id"))
            e["user_id"] = str(e["user_id"])
            formatted_events.append(e)
        return formatted_events
    except Exception as e:
        logger.error(f"[ERROR] get_user_events: {str(e)}")
        return []

async def create_user_event(user_id: str, event_data: dict) -> dict:
    try:
        now = datetime.utcnow()
        doc = {
            "user_id": ObjectId(user_id),
            "title": event_data.get("title"),
            "description": event_data.get("description"),
            "start_time": event_data.get("start_time"),
            "end_time": event_data.get("end_time"),
            "status": event_data.get("status", "pending"),
            "color": event_data.get("color", "#6d4aff"),
            "created_at": now,
            "updated_at": now
        }
        res = await db.calendar_events.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id")
        doc["user_id"] = str(doc["user_id"])
        return doc
    except Exception as e:
        logger.error(f"[ERROR] create_user_event: {str(e)}")
        return None

async def update_user_event(user_id: str, event_id: str, update_data: dict) -> dict:
    try:
        update_doc = {k: v for k, v in update_data.items() if v is not None}
        if not update_doc:
            # Nothing to update — return existing document
            existing = await db.calendar_events.find_one(
                {"_id": ObjectId(event_id), "user_id": ObjectId(user_id)}
            )
            if not existing:
                return None
            existing["id"] = str(existing.pop("_id"))
            existing["user_id"] = str(existing["user_id"])
            return existing

        update_doc["updated_at"] = datetime.utcnow()

        result = await db.calendar_events.update_one(
            {"_id": ObjectId(event_id), "user_id": ObjectId(user_id)},
            {"$set": update_doc}
        )

        # Return updated document regardless of modified_count
        # (modified_count can be 0 when values are identical — not an error)
        updated = await db.calendar_events.find_one({"_id": ObjectId(event_id)})
        if not updated:
            return None
        updated["id"] = str(updated.pop("_id"))
        updated["user_id"] = str(updated["user_id"])
        return updated
    except Exception as e:
        logger.error(f"[ERROR] update_user_event: {str(e)}")
        return None


async def delete_user_event(user_id: str, event_id: str) -> bool:
    try:
        res = await db.calendar_events.delete_one({"_id": ObjectId(event_id), "user_id": ObjectId(user_id)})
        return res.deleted_count > 0
    except Exception as e:
        logger.error(f"[ERROR] delete_user_event: {str(e)}")
        return False
