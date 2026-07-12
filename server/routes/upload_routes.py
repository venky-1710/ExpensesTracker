"""
Upload routes - File upload and transaction import endpoints
"""
from fastapi import APIRouter, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List
from apis.upload_api import UploadAPI
from utils.auth import get_current_user
from utils.helpers import api_handler

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
@api_handler
async def upload_and_analyze(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a bank statement (PDF/Excel/CSV), analyze it with AI,
    and return extracted transactions for user review.
    """
    content = await file.read()
    extracted_data = await UploadAPI.analyze_statement(content, file.filename)

    return {
        "message": "Analysis successful. Please review the transactions.",
        "count": len(extracted_data),
        "transactions": extracted_data
    }


@upload_router.post("/confirm")
@api_handler
async def confirm_transactions(
    payload: ConfirmPayload,
    current_user: dict = Depends(get_current_user)
):
    """Accept user-reviewed transactions and insert them into the database."""
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    return await UploadAPI.confirm_transactions(payload.transactions, user_id)


class TimesheetItem(BaseModel):
    date: str
    work_code: str
    duration: float
    description: str


class ConfirmTimesheetPayload(BaseModel):
    timesheets: List[TimesheetItem]


@upload_router.post("/timesheets/analyze")
@api_handler
async def analyze_timesheets(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document, analyze it with AI, and return extracted timesheets for user review.
    """
    content = await file.read()
    user_work_codes = current_user.get("custom_work_codes", [])
    extracted_data = await UploadAPI.analyze_timesheets(content, file.filename, user_work_codes)

    return {
        "message": "Analysis successful. Please review the timesheets.",
        "count": len(extracted_data),
        "timesheets": extracted_data
    }


@upload_router.post("/timesheets/confirm")
@api_handler
async def confirm_timesheets(
    payload: ConfirmTimesheetPayload,
    current_user: dict = Depends(get_current_user)
):
    """Accept user-reviewed timesheets and insert them into the database."""
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    return await UploadAPI.confirm_timesheets(payload.timesheets, user_id)
