from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any


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
