from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from utils.auth import get_current_user
from models.payloads import UserInDB, CalendarEventRequest, CalendarEventUpdate, CalendarEventResponse
from apis.calendar_api import get_user_events, create_user_event, update_user_event, delete_user_event, undo_event_payment
from apis.notification_api import create_notification
from apis.cache_api import cache_service
from utils.helpers import api_handler
from utils.cache import cached
from utils.email import send_event_created_email
from utils.logger import logger
from database.database import db
from bson import ObjectId
from models.payloads import TransactionCreate
from apis.transaction_api import TransactionAPI
import asyncio

router = APIRouter()


def _fmt_local_time(iso_str: str) -> str:
    """Format a local ISO datetime string (no timezone suffix) for display."""
    if not iso_str:
        return ""
    try:
        # Strip 'Z' or timezone offset so we keep the local wall-clock time
        clean = iso_str.replace("Z", "").split("+")[0].split(".")[0]
        dt = datetime.fromisoformat(clean)
        return dt.strftime("%b %d, %Y  %I:%M %p")
    except Exception:
        return iso_str


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
    """Create a new calendar event — fires in-app notification + confirmation email."""
    event = await create_user_event(str(current_user["id"]), request.model_dump())
    if not event:
        raise HTTPException(status_code=500, detail="Failed to create event")
    cache_service.invalidate_user_cache(str(current_user["id"]))

    # Build human-readable local-time string (no UTC conversion!)
    start_display = _fmt_local_time(event.get("start_time", ""))
    end_display   = _fmt_local_time(event.get("end_time", ""))
    event_time_str = f"{start_display} – {end_display.split('  ')[-1]}" if start_display else ""

    description = event.get("description") or ""
    amount      = event.get("amount")
    pay_cat     = event.get("payment_category", "")
    pay_method  = event.get("payment_method", "")

    # Build notification message
    msg_parts = [f'Your event "{event.get("title", "")}" has been scheduled for {event_time_str}.']
    if description:
        msg_parts.append(f"Note: {description}.")
    if amount:
        msg_parts.append(f"💳 Payment due: ₹{amount:,.2f}" + (f" via {pay_method}" if pay_method else "") + ".")
    msg_parts.append("We'll remind you before it starts!")

    notification_title   = "📅 Event Added Successfully"
    notification_message = " ".join(msg_parts)

    # Fire notification + email in background
    async def _side_effects():
        try:
            await create_notification(str(current_user["id"]), {
                "title": notification_title,
                "message": notification_message,
                "type": "event_created",
                "related_event_id": str(event.get("id", "")),
            })
        except Exception as exc:
            logger.error(f"[CALENDAR] Failed to create notification: {exc}")
        try:
            await send_event_created_email(
                to_email=current_user.get("email", ""),
                event_title=event.get("title", ""),
                event_time=event_time_str,
                description=description,
                amount=amount,
                payment_category=pay_cat,
                payment_method=pay_method,
            )
        except Exception as exc:
            logger.error(f"[CALENDAR] Failed to send event-created email: {exc}")

    asyncio.create_task(_side_effects())
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


@router.post("/{event_id}/mark-paid")
@api_handler
async def mark_event_paid(
    event_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Mark a calendar event as paid and auto-create a debit transaction.
    Triggered when user confirms payment via notification or calendar card.
    """
    # Fetch the event
    event = await db.calendar_events.find_one(
        {"_id": ObjectId(event_id), "user_id": ObjectId(str(current_user["id"]))}
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.get("is_paid"):
        return {"message": "Event already marked as paid", "transaction_id": None}

    amount = event.get("amount")
    if not amount:
        raise HTTPException(status_code=400, detail="No payment amount set for this event")

    # Create a transaction — type based on event's transaction_type
    tx_type = event.get("transaction_type", "debit")
    tx_date_str = event.get("start_time", "")
    try:
        clean = tx_date_str.replace("Z", "").split("+")[0].split(".")[0]
        tx_date = datetime.fromisoformat(clean)
    except Exception:
        tx_date = datetime.utcnow()

    default_category = "Salary" if tx_type == "credit" else "Bills"
    tx_data = TransactionCreate(
        amount=float(amount),
        type=tx_type,
        category=event.get("payment_category") or default_category,
        description=f"{'Income' if tx_type == 'credit' else 'Payment'} for event: {event.get('title', '')}",
        payment_method=event.get("payment_method") or "Cash",
        date=tx_date,
    )
    transaction = await TransactionAPI.create_transaction(str(current_user["id"]), tx_data)

    # Mark event as paid
    await db.calendar_events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"is_paid": True, "payment_notified": True, "transaction_id": transaction.get("id") if transaction else None, "updated_at": datetime.utcnow()}}
    )

    # Remove the old "payment_due" notification to prevent duplicate actions
    try:
        await db.notifications.delete_many(
            {"related_event_id": event_id, "type": "payment_due"}
        )
    except Exception as e:
        logger.error(f"Failed to delete old payment_due notifications: {e}")

    # Invalidate cache
    cache_service.invalidate_user_cache(str(current_user["id"]))

    # Create a success notification
    try:
        verb = "Income" if tx_type == "credit" else "Payment"
        await create_notification(str(current_user["id"]), {
            "title": "✅ Transaction Recorded",
            "message": (
                f"{verb} of ₹{amount:,.2f} for \"{event.get('title', '')}\" has been recorded "
                f"as a {tx_type} transaction."
            ),
            "type": "payment_confirmed",
            "related_event_id": event_id,
        })
    except Exception as exc:
        logger.error(f"[CALENDAR] Failed to create payment-confirmed notification: {exc}")

    return {
        "success": True,
        "message": "Payment marked and transaction created",
        "transaction_id": transaction.get("id") if transaction else None,
    }


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

@router.post("/{event_id}/undo-paid")
@api_handler
async def undo_mark_paid(
    event_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Revert an event to unpaid and delete its transaction"""
    event = await db.calendar_events.find_one({"_id": ObjectId(event_id), "user_id": ObjectId(current_user["id"])})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    transaction_id = event.get("transaction_id")
    
    # Fallback for older events that didn't store transaction_id
    if not transaction_id:
        tx_type = event.get("transaction_type", "debit")
        expected_desc = f"{'Income' if tx_type == 'credit' else 'Payment'} for event: {event.get('title', '')}"
        old_tx = await db.transactions.find_one({
            "user_id": ObjectId(current_user["id"]),
            "description": expected_desc
        })
        if old_tx:
            transaction_id = str(old_tx["_id"])
    
    if transaction_id:
        try:
            await TransactionAPI.delete_transaction(str(current_user["id"]), transaction_id)
        except Exception as e:
            logger.error(f"Failed to delete transaction {transaction_id} on undo: {e}")
            
    success = await undo_event_payment(str(current_user["id"]), event_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to revert event payment status")
        
    try:
        await db.notifications.delete_many(
            {"related_event_id": event_id, "type": "payment_confirmed"}
        )
    except Exception as e:
        logger.error(f"Failed to delete old payment_confirmed notifications: {e}")
        
    cache_service.invalidate_user_cache(str(current_user["id"]))
    
    return {"success": True, "message": "Event payment reverted"}
