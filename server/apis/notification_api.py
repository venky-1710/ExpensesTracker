from datetime import datetime
from bson import ObjectId
from database.database import client
from utils.logger import logger
import os

db = client[os.getenv("DATABASE_NAME", "ExpenseTrack")]
notifications_collection = db["notifications"]

async def create_notification(user_id: str, data: dict):
    try:
        notification = {
            "user_id": user_id,
            "title": data["title"],
            "message": data["message"],
            "type": data.get("type", "info"),
            "is_read": False,
            "related_event_id": data.get("related_event_id"),
            "created_at": datetime.utcnow()
        }
        result = await notifications_collection.insert_one(notification)
        if result.inserted_id:
            notification["id"] = str(result.inserted_id)
            del notification["_id"]
            return notification
        return None
    except Exception as e:
        logger.error(f"[DB ERROR] create_notification failed: {str(e)}")
        return None

async def get_user_notifications(user_id: str, limit: int = 50):
    try:
        cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        notifications = await cursor.to_list(length=limit)

        # Collect all related event IDs in one pass
        related_event_ids = []
        for n in notifications:
            n["id"] = str(n["_id"])
            del n["_id"]
            if n.get("related_event_id"):
                try:
                    related_event_ids.append(ObjectId(n["related_event_id"]))
                except Exception:
                    pass

        # Fetch ALL related events in a single query (avoids N+1)
        events_map = {}
        if related_event_ids:
            events_collection = db["calendar_events"]
            ev_cursor = events_collection.find({"_id": {"$in": related_event_ids}})
            async for ev in ev_cursor:
                events_map[str(ev["_id"])] = ev

        # Enrich notifications using the in-memory events map
        for n in notifications:
            if n.get("related_event_id"):
                ev = events_map.get(n["related_event_id"])
                if ev:
                    n["related_event_start_time"] = ev.get("start_time")
                    if n.get("type") == "payment_due":
                        n["related_event_amount"] = ev.get("amount")
                        n["related_event_payment_method"] = ev.get("payment_method")

        return notifications
    except Exception as e:
        logger.error(f"[DB ERROR] get_user_notifications failed: {str(e)}")
        return []


async def mark_notification_read(user_id: str, notification_id: str):
    try:
        result = await notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"[DB ERROR] mark_notification_read failed: {str(e)}")
        return False

async def mark_all_notifications_read(user_id: str):
    try:
        result = await notifications_collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return result.modified_count
    except Exception as e:
        logger.error(f"[DB ERROR] mark_all_notifications_read failed: {str(e)}")
        return 0

async def delete_notification(user_id: str, notification_id: str):
    try:
        result = await notifications_collection.delete_one(
            {"_id": ObjectId(notification_id), "user_id": user_id}
        )
        return result.deleted_count > 0
    except Exception as e:
        logger.error(f"[DB ERROR] delete_notification failed: {str(e)}")
        return False

async def clear_all_notifications(user_id: str):
    try:
        result = await notifications_collection.delete_many({"user_id": user_id})
        return result.deleted_count
    except Exception as e:
        logger.error(f"[DB ERROR] clear_all_notifications failed: {str(e)}")
        return 0
