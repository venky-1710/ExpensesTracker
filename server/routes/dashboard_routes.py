"""
Dashboard routes - Analytics and dashboard data endpoints
"""
from fastapi import APIRouter, Depends, Query, Request
from models.payloads import APIResponse
from apis.dashboard_api import DashboardAPI
from utils.auth import get_current_user
from utils.helpers import api_handler
from utils.cache import cached
from datetime import datetime
from typing import Optional

dashboard_router = APIRouter()


@dashboard_router.get("/kpis")
@cached(ttl_seconds=300)
async def get_kpis(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("all", pattern="^(all|6days|week|month|6months|year|custom)$"),
    kpi_type: Optional[str] = Query(None, pattern="^(income|expense|balance|transactions)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all dashboard KPIs with period comparison."""
    kpis = await DashboardAPI.get_kpis(
        current_user["id"], filter_type, start_date, end_date, kpi_type
    )

    return APIResponse(
        success=True,
        data=kpis,
        meta={
            "filter_type": filter_type,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None
        }
    )


@dashboard_router.get("/charts")
@cached(ttl_seconds=300)
async def get_charts(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("all", pattern="^(all|6days|week|month|6months|year|custom)$"),
    chart_type: Optional[str] = Query(None, pattern="^(credit_vs_debit|category_breakdown|expense_distribution|payment_methods)$"),
    granularity: Optional[str] = Query(None, pattern="^(daily|weekly|monthly|quarterly|yearly)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all chart data."""
    charts = await DashboardAPI.get_charts(
        current_user["id"], filter_type, start_date, end_date, chart_type, granularity
    )

    return APIResponse(success=True, data=charts, meta={"filter_type": filter_type})


@dashboard_router.get("/widgets")
@cached(ttl_seconds=300)
async def get_widgets(
    request: Request,
    current_user: dict = Depends(get_current_user),
    filter_type: str = Query("all", pattern="^(all|6days|week|month|6months|year|custom)$"),
    widget_type: Optional[str] = Query(None, pattern="^(recent_transactions|top_categories|highest_expense|monthly_savings)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all widget data."""
    widgets = await DashboardAPI.get_widgets(
        current_user["id"], filter_type, start_date, end_date, widget_type=widget_type
    )

    return APIResponse(success=True, data=widgets, meta={"filter_type": filter_type})


@dashboard_router.get("/spending")
@cached(ttl_seconds=600)
async def get_spending_trend(
    request: Request,
    current_user: dict = Depends(get_current_user),
    year: int = Query(default=None, description="Year to fetch data for, defaults to current year"),
    period: str = Query(default="months", pattern="^(months|quarters)$")
):
    """Get spending trend (income vs expenses) by month or quarter for a given year."""
    from datetime import datetime as dt
    resolved_year = year or dt.now().year
    data = await DashboardAPI.get_spending_trend(current_user["id"], resolved_year, period)
    return APIResponse(success=True, data=data, meta={"year": resolved_year, "period": period})
