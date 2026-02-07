"""
Date filtering and period calculation utilities
"""
from datetime import datetime, timedelta
from typing import Tuple, Optional


def get_date_range(
    filter_type: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Tuple[datetime, datetime]:
    """
    Get date range based on filter type
    
    Args:
        filter_type: "6days" | "week" | "month" | "6months" | "year" | "custom"
        start_date: Custom start date (for custom filter)
        end_date: Custom end date (for custom filter)
    
    Returns:
        Tuple of (start_datetime, end_datetime)
    """
    now = datetime.now()
    
    if filter_type == "6days":
        start = now - timedelta(days=6)
        end = now
    elif filter_type == "week":
        start = now - timedelta(days=7)
        end = now
    elif filter_type == "month":
        start = now - timedelta(days=30)
        end = now
    elif filter_type == "6months":
        start = now - timedelta(days=180)
        end = now
    elif filter_type == "year":
        start = now - timedelta(days=365)
        end = now
    elif filter_type == "custom":
        if not start_date or not end_date:
            raise ValueError("start_date and end_date required for custom filter")
        start = start_date
        end = end_date
    else:
        raise ValueError(f"Invalid filter_type: {filter_type}")
    
    # Set time to start/end of day
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    return start, end


def get_previous_period(start_date: datetime, end_date: datetime) -> Tuple[datetime, datetime]:
    """
    Get the previous period of the same length for comparison
    
    Args:
        start_date: Current period start
        end_date: Current period end
    
    Returns:
        Tuple of (previous_start, previous_end)
    """
    period_length = end_date - start_date
    previous_end = start_date - timedelta(seconds=1)
    previous_start = previous_end - period_length
    
    return previous_start, previous_end


def get_period_name(filter_type: str) -> str:
    """Get human-readable period name"""
    names = {
        "6days": "Last 6 Days",
        "week": "Last Week",
        "month": "Last Month",
        "6months": "Last 6 Months",
        "year": "Last Year",
        "custom": "Custom Period"
    }
    return names.get(filter_type, "Unknown Period")


def group_by_interval(filter_type: str) -> str:
    """
    Determine the grouping interval for aggregations based on filter
    
    Returns: "day" | "week" | "month"
    """
    if filter_type in ["6days", "week"]:
        return "day"
    elif filter_type in ["month"]:
        return "day"
    elif filter_type in ["6months"]:
        return "week"
    elif filter_type in ["year"]:
        return "month"
    else:
        return "day"  # Default
