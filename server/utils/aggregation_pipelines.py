"""
Reusable MongoDB aggregation pipelines for dashboard analytics
"""
from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Any


def build_kpi_pipeline(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for KPI calculations
    Returns: total_credits, total_debits, transaction_count, category_breakdown
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
                "min_transaction": {"$min": "$amount"},
                "max_transaction": {"$max": "$amount"}
            }
        }
    ]


def build_category_pipeline(user_id: str, start_date: datetime, end_date: datetime, type_filter: str = None) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for category breakdown
    """
    match_stage = {
        "user_id": ObjectId(user_id),
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if type_filter:
        match_stage["type"] = type_filter
    
    return [
        {"$match": match_stage},
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
                "avg": {"$avg": "$amount"}
            }
        },
        {"$sort": {"total": -1}}
    ]


def build_timeline_pipeline(user_id: str, start_date: datetime, end_date: datetime, group_by: str = "day") -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for credit vs debit timeline
    group_by: "day" | "week" | "month"
    """
    # Date grouping format
    date_format = {
        "day": {
            "year": {"$year": "$date"},
            "month": {"$month": "$date"},
            "day": {"$dayOfMonth": "$date"}
        },
        "week": {
            "year": {"$isoWeekYear": "$date"},
            "week": {"$isoWeek": "$date"}
        },
        "month": {
            "year": {"$year": "$date"},
            "month": {"$month": "$date"}
        }
    }
    
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "date": date_format.get(group_by, date_format["day"]),
                    "type": "$type"
                },
                "amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id.date": 1}}
    ]


def build_payment_method_pipeline(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for payment method distribution
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": "$payment_method",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"total": -1}}
    ]


def build_monthly_savings_pipeline(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for monthly savings (credits - debits)
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"},
                    "type": "$type"
                },
                "amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]


def build_highest_expense_pipeline(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline to find highest single expense
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "type": "debit",
                "date": {"$gte": start_date, "$lte": end_date}
            }
        },
        {"$sort": {"amount": -1}},
        {"$limit": 1}
    ]


def build_recent_transactions_pipeline(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for recent transactions
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id)
            }
        },
        {"$sort": {"date": -1}},
        {"$limit": limit}
    ]


def build_budget_alerts_pipeline(user_id: str, year: int, month: int) -> List[Dict[str, Any]]:
    """
    Aggregation pipeline for budget alerts (spending vs limits)
    This will be joined with budgets collection
    """
    return [
        {
            "$match": {
                "user_id": ObjectId(user_id),
                "type": "debit",
                "date": {
                    "$gte": datetime(year, month, 1),
                    "$lt": datetime(year + (1 if month == 12 else 0), (month % 12) + 1, 1)
                }
            }
        },
        {
            "$group": {
                "_id": "$category",
                "spent": {"$sum": "$amount"}
            }
        }
    ]
