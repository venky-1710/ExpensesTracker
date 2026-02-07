from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class BudgetCreate(BaseModel):
    """Create budget payload"""
    category: str = Field(..., min_length=1, max_length=50)
    monthly_limit: float = Field(..., gt=0)
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)


class BudgetUpdate(BaseModel):
    """Update budget payload"""
    monthly_limit: Optional[float] = Field(None, gt=0)
    is_active: Optional[bool] = None


class BudgetResponse(BaseModel):
    """Budget response"""
    id: str
    user_id: str
    category: str
    monthly_limit: float
    year: int
    month: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BudgetStatus(BaseModel):
    """Budget status with spending info"""
    budget: BudgetResponse
    spent: float
    remaining: float
    percentage_used: float
    is_exceeded: bool

    class Config:
        from_attributes = True
