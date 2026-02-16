from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from database.database import db
from services.ai_service import analyze_statement
from utils.auth import get_current_user
from utils.logger import logger
import traceback

upload_router = APIRouter()


class TransactionItem(BaseModel):
    date: str
    description: str
    amount: float
    type: str  # 'credit' or 'debit'
    category: str


class ConfirmPayload(BaseModel):
    transactions: List[TransactionItem]


@upload_router.post("/analyze")
async def upload_and_analyze(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Upload a bank statement (PDF/Excel/CSV), analyze it with AI,
    and return extracted transactions for user review (does NOT save to DB).
    """
    try:
        content = await file.read()
        extracted_data = await analyze_statement(content, file.filename)

        return {
            "message": "Analysis successful. Please review the transactions.",
            "count": len(extracted_data),
            "transactions": extracted_data
        }

    except Exception as e:
        logger.error(f"❌ Error analyzing file: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@upload_router.post("/confirm")
async def confirm_transactions(payload: ConfirmPayload, current_user: dict = Depends(get_current_user)):
    """
    Accept user-reviewed transactions and insert them into the database.
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
        logger.info(f"🔍 DEBUG confirm_transactions: current_user keys={list(current_user.keys())}")
        logger.info(f"🔍 DEBUG confirm_transactions: user_id='{user_id}' type={type(user_id).__name__}")
        logger.info(f"🔍 DEBUG confirm_transactions: ObjectId(user_id)={ObjectId(user_id)}")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user authentication")

        if not payload.transactions:
            return {"message": "No transactions to import.", "count": 0}

        transactions_to_insert = []
        now = datetime.now()
        for item in payload.transactions:
            # Parse date string to datetime (matching TransactionService schema)
            try:
                parsed_date = datetime.fromisoformat(item.date)
            except ValueError:
                parsed_date = datetime.strptime(item.date, "%Y-%m-%d")

            transaction = {
                "user_id": ObjectId(user_id),
                "amount": abs(item.amount),
                "type": item.type,
                "category": item.category.strip(),
                "description": item.description.strip(),
                "payment_method": "Other",
                "date": parsed_date,
                "created_at": now,
                "updated_at": now
            }
            transactions_to_insert.append(transaction)

        logger.info(f"🔍 DEBUG: Sample transaction to insert: {transactions_to_insert[0]}")
        result = await db.transactions.insert_many(transactions_to_insert)
        logger.info(f"✅ Imported {len(result.inserted_ids)} transactions for user {user_id}. IDs: {result.inserted_ids[:3]}")

        return {
            "message": "Transactions imported successfully!",
            "count": len(result.inserted_ids)
        }

    except Exception as e:
        logger.error(f"❌ Error confirming transactions: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
