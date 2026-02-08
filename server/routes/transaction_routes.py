"""
Transaction routes - Transaction management endpoints
"""
from fastapi import APIRouter, Depends, Query, Response, status, HTTPException
from typing import Optional
from fastapi.responses import StreamingResponse
from models.payloads import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionFilter,
    PaginationParams,
    TransactionListResponse,
    APIResponse
)
from services.transaction_service import TransactionService
from utils.auth import get_current_user
from utils.logger import logger
from datetime import datetime
from utils.date_helpers import get_date_range

import io
import traceback

transaction_router = APIRouter()


@transaction_router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new transaction"""
    try:
        logger.info(f"📝 Creating transaction for user: {current_user['email']}")
        return await TransactionService.create_transaction(
            current_user["id"],
            payload
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Create transaction error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred"
        )


@transaction_router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=1000),
    sort_by: str = Query("date", pattern="^(date|amount|category|type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    filter_type: Optional[str] = Query(None, pattern="^(6days|week|month|6months|year|custom)$"),
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,  # Search in description
    current_user: dict = Depends(get_current_user)
):
    """List transactions with pagination and filtering"""
    try:
        # Handle date filter
        if filter_type:
            s_date, e_date = get_date_range(filter_type, start_date, end_date)
            # Use calculated dates if not explicitly provided
            if not start_date:
                start_date = s_date
            if not end_date:
                end_date = e_date

        pagination = PaginationParams(
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        filters = TransactionFilter(
            type=type,
            category=category,
            payment_method=payment_method,
            start_date=start_date,
            end_date=end_date,
            search=search
        )
        
        return await TransactionService.list_transactions(
            current_user["id"],
            filters,
            pagination
        )
    except Exception as e:
        logger.error(f"❌ List transactions error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list transactions"
        )


@transaction_router.get("/export")
async def export_transactions(
    format: str = Query("csv", pattern="^(csv)$"),
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export transactions to CSV"""
    try:
        filters = TransactionFilter(
            type=type,
            category=category,
            start_date=start_date,
            end_date=end_date
        )
        
        csv_content = await TransactionService.export_transactions(
            current_user["id"],
            filters
        )
        
        filename = f"transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"❌ Export transactions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export transactions"
        )


@transaction_router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific transaction"""
    transaction = await TransactionService.get_transaction(
        current_user["id"],
        transaction_id
    )
    return TransactionResponse(**transaction)


@transaction_router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    update_data: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a transaction"""
    transaction = await TransactionService.update_transaction(
        current_user["id"],
        transaction_id,
        update_data
    )
    return TransactionResponse(**transaction)


@transaction_router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a transaction"""
    result = await TransactionService.delete_transaction(
        current_user["id"],
        transaction_id
    )
    return APIResponse(success=True, data=result)
