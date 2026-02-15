"""
Dashboard routes - Analytics and dashboard data endpoints
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from models.payloads import APIResponse
from services.dashboard_service import DashboardService
from utils.auth import get_current_user
from utils.logger import logger
from datetime import datetime
from typing import Optional
import traceback

from utils.cache import cached

dashboard_router = APIRouter()


@dashboard_router.get("/kpis")
@cached(ttl_seconds=300)
async def get_kpis(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("month", pattern="^(6days|week|month|6months|year|custom)$"),
    kpi_type: Optional[str] = Query(None, pattern="^(income|expense|balance|transactions)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all dashboard KPIs with period comparison"""
    try:
        logger.info(f"📊 KPIs request: {current_user.get('email')} - filter: {filter_type}")
        kpis = await DashboardService.get_kpis(
            current_user["id"],
            filter_type,
            start_date,
            end_date,
            kpi_type
        )
        
        logger.info(f"✅ KPIs returned successfully")
        return APIResponse(
            success=True,
            data=kpis,
            meta={
                "filter_type": filter_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ KPIs error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.get("/charts")
@cached(ttl_seconds=300)
async def get_charts(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("month", pattern="^(6days|week|month|6months|year|custom)$"),
    chart_type: Optional[str] = Query(None, pattern="^(credit_vs_debit|category_breakdown|expense_distribution|payment_methods)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all chart data"""
    try:
        logger.info(f"📈 Charts request: {current_user.get('email')} - filter: {filter_type} - type: {chart_type}")
        charts = await DashboardService.get_charts(
            current_user["id"],
            filter_type,
            start_date,
            end_date,
            chart_type
        )
        
        logger.info(f"✅ Charts returned successfully")
        return APIResponse(
            success=True,
            data=charts,
            meta={"filter_type": filter_type}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Charts error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.get("/widgets")
@cached(ttl_seconds=300)
async def get_widgets(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("month", pattern="^(6days|week|month|6months|year|custom)$"),
    widget_type: Optional[str] = Query(None, pattern="^(recent_transactions|top_categories|highest_expense|monthly_savings)$")
):
    """Get all widget data"""
    try:
        logger.info(f"🧩 Widgets request: {current_user.get('email')} - filter: {filter_type} - type: {widget_type}")
        widgets = await DashboardService.get_widgets(
            current_user["id"],
            filter_type,
            widget_type=widget_type
        )
        
        logger.info(f"✅ Widgets returned successfully")
        return APIResponse(
            success=True,
            data=widgets,
            meta={"filter_type": filter_type}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Widgets error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

