from pydantic import BaseModel
from typing import Any, Optional


class APIResponse(BaseModel):
    """Standardized API response format"""
    success: bool
    data: Any = None
    meta: dict = {}
    error: Optional[str] = None

    class Config:
        from_attributes = True
