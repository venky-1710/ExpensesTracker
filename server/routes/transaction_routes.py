"""
Transaction routes - Transaction management endpoints
"""
from fastapi import APIRouter, Depends, Query, status, Request
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
from apis.transaction_api import TransactionAPI
from apis.cache_api import cache_service
from utils.auth import get_current_user
from utils.helpers import api_handler
from utils.cache import cached
from utils.date_helpers import get_date_range
from datetime import datetime
import io

transaction_router = APIRouter()


@transaction_router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
@api_handler
async def create_transaction(
    payload: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new transaction."""
    result = await TransactionAPI.create_transaction(current_user["id"], payload)
    # Invalidate cache for this user
    cache_service.invalidate_user_cache(current_user["id"])
    return result


@transaction_router.get("", response_model=TransactionListResponse)
@cached(ttl_seconds=60)
async def list_transactions(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=1000),
    sort_by: str = Query("date", pattern="^(date|amount|category|type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    filter_type: Optional[str] = Query(None, pattern="^(all|6days|week|month|6months|year|custom)$"),
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List transactions with pagination and filtering."""
    # Handle date filter
    if filter_type:
        s_date, e_date = get_date_range(filter_type, start_date, end_date)
        if not start_date:
            start_date = s_date
        if not end_date:
            end_date = e_date

    pagination = PaginationParams(
        page=page, limit=limit, sort_by=sort_by, sort_order=sort_order
    )

    filters = TransactionFilter(
        type=type, category=category, payment_method=payment_method,
        start_date=start_date, end_date=end_date, search=search
    )

    return await TransactionAPI.list_transactions(current_user["id"], filters, pagination)


@transaction_router.get("/export")
@api_handler
async def export_transactions(
    format: str = Query("csv", pattern="^(csv|pdf|xlsx)$"),
    type: Optional[str] = Query(None, pattern="^(credit|debit)$"),
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export transactions to CSV, PDF, or Excel."""
    filters = TransactionFilter(
        type=type, category=category,
        start_date=start_date, end_date=end_date
    )

    content = await TransactionAPI.export_transactions(
        current_user["id"], filters, format, user=current_user
    )

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    if format == "csv":
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transactions_{timestamp}.csv"}
        )
    elif format == "pdf":
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=transactions_{timestamp}.pdf"}
        )
    elif format == "xlsx":
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=transactions_{timestamp}.xlsx"}
        )


@transaction_router.get("/{transaction_id}", response_model=TransactionResponse)
@api_handler
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific transaction."""
    return await TransactionAPI.get_transaction(current_user["id"], transaction_id)


@transaction_router.put("/{transaction_id}", response_model=TransactionResponse)
@api_handler
async def update_transaction(
    transaction_id: str,
    update_data: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a transaction."""
    result = await TransactionAPI.update_transaction(
        current_user["id"], transaction_id, update_data
    )
    cache_service.invalidate_user_cache(current_user["id"])
    return result


@transaction_router.delete("/{transaction_id}")
@api_handler
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a transaction."""
    result = await TransactionAPI.delete_transaction(current_user["id"], transaction_id)
    cache_service.invalidate_user_cache(current_user["id"])
    return APIResponse(success=True, data=result)
