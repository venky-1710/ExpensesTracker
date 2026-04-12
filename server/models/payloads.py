"""
Consolidated Payloads and Models
"""
from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any, Union, List, Literal


# --- Response Models ---

class APIResponse(BaseModel):
    """Standardized API response format"""
    success: bool
    data: Any = None
    meta: dict = {}
    error: Optional[str] = None

    class Config:
        from_attributes = True


# --- User Models ---

class UserCreate(BaseModel):
    """User registration payload"""
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    """User login payload"""
    email: str
    password: str


class UserProfileResponse(BaseModel):
    """Complete user profile response"""
    id: str
    full_name: str
    username: Optional[str] = None  # Optional for backward compatibility
    email: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None  # Base64 encoded
    banner_image: Optional[str] = None
    role: str = "user"
    currency_preference: str = "USD"
    theme_preference: str = "light"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Update user profile"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    banner_image: Optional[str] = None


class PasswordChange(BaseModel):
    """Change password payload"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class UserPreferences(BaseModel):
    """User preferences update"""
    currency_preference: Optional[str] = None
    theme_preference: Optional[str] = Field(None, pattern="^(light|dark)$")


class UserInDB(BaseModel):
    """User document in database"""
    id: Optional[str] = None
    full_name: str
    username: Optional[str] = None  # Optional for backward compatibility
    email: EmailStr
    password_hash: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    banner_image: Optional[str] = None
    role: str = "user"
    currency_preference: str = "USD"
    theme_preference: str = "light"
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str


# --- Transaction Models ---

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


# Chat Models
class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's message to the chatbot")
    thread_id: Optional[str] = Field(default=None, description="The specific chat thread ID")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "How much did I spend on food this month?",
                "thread_id": "uuid-v4-string"
            }
        }

class ChatResponse(BaseModel):
    response: str = Field(..., description="The chatbot's response")
    thread_id: str = Field(..., description="The specific chat thread ID")

    class Config:
        json_schema_extra = {
            "example": {
                "response": "You spent ₹5,000 on food this month.",
                "thread_id": "uuid-v4-string"
            }
        }

class ThreadTitleUpdate(BaseModel):
    title: str = Field(..., description="The new title for the chat thread")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "September Budget Tips"
            }
        }


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
    transactions: List[TransactionResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    total_credits: float = 0.0
    total_debits: float = 0.0
    available_balance: float = 0.0

    class Config:
        from_attributes = True


# --- Budget Models ---

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


# --- Widget Models ---

class WidgetMappingCreate(BaseModel):
    """Create widget mapping payload"""
    widget_name: str = Field(..., min_length=1, max_length=100)
    api_endpoint: str = Field(..., min_length=1, max_length=200)
    kpi_mapping: Dict[str, Any] = Field(default_factory=dict)
    chart_mapping: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    order: int = Field(..., ge=0)


class WidgetMappingUpdate(BaseModel):
    """Update widget mapping payload"""
    widget_name: Optional[str] = Field(None, min_length=1, max_length=100)
    api_endpoint: Optional[str] = Field(None, min_length=1, max_length=200)
    kpi_mapping: Optional[Dict[str, Any]] = None
    chart_mapping: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    order: Optional[int] = Field(None, ge=0)


class WidgetMappingResponse(BaseModel):
    """Widget mapping response"""
    id: str
    widget_name: str
    api_endpoint: str
    kpi_mapping: Dict[str, Any]
    chart_mapping: Dict[str, Any]
    is_active: bool
    order: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Calendar Event Models ---

class CalendarEventRequest(BaseModel):
    title: str = Field(..., max_length=100)
    description: Optional[str] = None
    start_time: str = Field(..., description="ISO 8601 string")
    end_time: str = Field(..., description="ISO 8601 string")
    status: str = Field(default="pending")
    color: str = Field(default="#6d4aff")

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None

class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    status: str
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
