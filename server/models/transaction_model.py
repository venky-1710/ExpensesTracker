from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal


class TransactionCreate(BaseModel):
    """Create transaction payload"""
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    type: Literal["credit", "debit"]
    category: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    payment_method: str = Field(..., min_length=1, max_length=50)
    date: datetime

    @field_validator('amount')
    @classmethod
    def round_amount(cls, v):
        """Round to 2 decimal places"""
        return round(v, 2)


class TransactionUpdate(BaseModel):
    """Update transaction payload"""
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[Literal["credit", "debit"]] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    payment_method: Optional[str] = Field(None, min_length=1, max_length=50)
    date: Optional[datetime] = None

    @field_validator('amount')
    @classmethod
    def round_amount(cls, v):
        if v is not None:
            return round(v, 2)
        return v


class TransactionResponse(BaseModel):
    """Transaction response"""
    id: str
    user_id: str
    amount: float
    type: Literal["credit", "debit"]
    category: str
    description: Optional[str] = None
    payment_method: str
    date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionFilter(BaseModel):
    """Transaction filter parameters"""
    type: Optional[Literal["credit", "debit"]] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None  # Search in description


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=1000)
    sort_by: str = Field("date", pattern="^(date|amount|category|type)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class TransactionListResponse(BaseModel):
    """Paginated transaction list response"""
    transactions: list[TransactionResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    class Config:
        from_attributes = True
