import asyncio
from datetime import datetime
from database.database import client
from utils.logger import logger
from utils.email import send_event_reminder_email
from apis.notification_api import create_notification
from bson import ObjectId
import os

db = client[os.getenv("DATABASE_NAME", "ExpenseTrack")]
events_collection = db["calendar_events"]
users_collection  = db["auth_users"]

async def check_upcoming_events():
    """Poll events and dispatch reminder + payment-due notifications."""
    try:
        now = datetime.utcnow()

        cursor = events_collection.find({
            "$or": [
                {"notified_1_day":    {"$ne": True}},
                {"notified_same_day": {"$ne": True}},
                # Events with unpaid amount that start today (payment_due check)
                {"amount": {"$ne": None}, "is_paid": {"$ne": True}, "payment_notified": {"$ne": True}},
            ],
            "status": {"$ne": "cancelled"}
        })

        async for event in cursor:
            start_time_str = event.get("start_time")
            if not start_time_str:
                continue

            try:
                clean = start_time_str.replace("Z", "").split("+")[0].split(".")[0]
                start_time = datetime.fromisoformat(clean)
            except ValueError as e:
                logger.error(f"[SCHEDULER] Could not parse date {start_time_str}: {e}")
                continue

            time_diff = start_time - now
            user_id   = str(event["user_id"])
            event_id  = str(event["_id"])
            title     = event.get("title", "Event")
            amount    = event.get("amount")

            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                continue
            email = user.get("email")

            # ─── 1-day reminder (≤ 24 h away) ────────────────────────────────
            if 0 < time_diff.total_seconds() <= 86400 and not event.get("notified_1_day"):
                logger.info(f"[SCHEDULER] 1-day reminder → event {event_id}")
                msg = f"Your event '{title}' is tomorrow at {start_time.strftime('%I:%M %p')}."
                if amount:
                    msg += f" 💳 Payment due: ₹{amount:,.2f}."
                await create_notification(user_id, {
                    "title": "📅 Upcoming Event Tomorrow",
                    "message": msg,
                    "type": "event_reminder",
                    "related_event_id": event_id,
                })
                if email:
                    await send_event_reminder_email(email, title, start_time.strftime("%Y-%m-%d %I:%M %p"), "1_day")
                await events_collection.update_one(
                    {"_id": ObjectId(event_id)}, {"$set": {"notified_1_day": True}}
                )

            # ─── Same-day reminder (≤ 2 h away) ──────────────────────────────
            if 0 < time_diff.total_seconds() <= 7200 and not event.get("notified_same_day"):
                logger.info(f"[SCHEDULER] Same-day reminder → event {event_id}")
                msg = f"Your event '{title}' is starting soon at {start_time.strftime('%I:%M %p')}."
                if amount:
                    msg += f" 💳 Payment due: ₹{amount:,.2f}."
                await create_notification(user_id, {
                    "title": "⏰ Event Starting Soon",
                    "message": msg,
                    "type": "event_reminder",
                    "related_event_id": event_id,
                })
                if email:
                    await send_event_reminder_email(email, title, start_time.strftime("%Y-%m-%d %I:%M %p"), "same_day")
                await events_collection.update_one(
                    {"_id": ObjectId(event_id)}, {"$set": {"notified_same_day": True}}
                )

            # ─── Payment-due notification (event has passed / is happening today & unpaid) ─
            if (
                amount
                and not event.get("is_paid")
                and not event.get("payment_notified")
                and -86400 <= time_diff.total_seconds() <= 0   # event started within last 24h
            ):
                logger.info(f"[SCHEDULER] Payment-due notification → event {event_id}")
                tx_type    = event.get("transaction_type", "debit")
                pay_method = event.get("payment_method", "")
                method_str = f" via {pay_method}" if pay_method else ""

                if tx_type == "credit":
                    notif_title = "💰 Income Received Today?"
                    notif_msg   = (
                        f"Your scheduled income \"{title}\" is due today. "
                        f"Did you receive ₹{amount:,.2f}{method_str}? "
                        f"Tap 'Mark as Received' to record it in your transactions."
                    )
                else:
                    notif_title = "💳 Did you make this payment?"
                    notif_msg   = (
                        f"Your event \"{title}\" was due today. "
                        f"Did you pay ₹{amount:,.2f}{method_str}? "
                        f"Tap 'Mark as Paid' to record it in your transactions."
                    )

                # Atomically ensure we only notify if not paid yet
                result = await events_collection.update_one(
                    {"_id": ObjectId(event_id), "payment_notified": {"$ne": True}, "is_paid": {"$ne": True}},
                    {"$set": {"payment_notified": True}}
                )
                
                if result.modified_count > 0:
                    await create_notification(user_id, {
                        "title": notif_title,
                        "message": notif_msg,
                        "type": "payment_due",
                        "related_event_id": event_id,
                    })

    except Exception as e:
        logger.error(f"[SCHEDULER ERROR] {str(e)}")


async def scheduler_loop():
    """Background loop to check events periodically."""
    logger.info("[SCHEDULER] Background scheduler started")
    while True:
        await check_upcoming_events()
        await asyncio.sleep(60)
