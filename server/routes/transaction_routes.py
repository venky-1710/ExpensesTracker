"""
Transaction routes - Transaction management endpoints
"""
from fastapi import APIRouter, Depends, Query, Response, status, HTTPException
from fastapi.responses import StreamingResponse
from models.transaction_model import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
   TransactionFilter,
    PaginationParams,
    TransactionListResponse
)
from models.response_model import APIResponse
from services.transaction_service import TransactionService
from utils.auth import get_current_user
from utils.logger import logger
from datetime import datetime
from typing import Optional
import io
import traceback

transaction_router = APIRouter(prefix="/transactions", tags=["transactions"])

transaction_router = APIRouter(prefix="/transactions", tags=["transactions"])


@transaction_router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new transaction"""
    transaction = await TransactionService.create_transaction(
        current_user["id"],
        transaction_data
    )
    return TransactionResponse(**transaction)


@transaction_router.get("", response_model=TransactionListResponse)
async def list_transactions(
    current_user: dict = Depends(get_current_user),
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|amount|category|type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    # Filters
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None
):
    """List transactions with filters and pagination"""
    filters = TransactionFilter(
        type=type,
        category=category,
        payment_method=payment_method,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    
    pagination = PaginationParams(
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    result = await TransactionService.list_transactions(
        current_user["id"],
        filters,
        pagination
    )
    
    return TransactionListResponse(**result)


@transaction_router.get("/export")
async def export_transactions(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Export transactions to CSV"""
    filters = TransactionFilter(
        type=type,
        category=category,
        payment_method=payment_method,
        start_date=start_date,
        end_date=end_date
    )
    
    csv_data = await TransactionService.export_to_csv(current_user["id"], filters)
    
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@transaction_router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single transaction by ID"""
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
