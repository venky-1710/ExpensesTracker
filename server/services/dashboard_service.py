"""
Dashboard service - Business logic for dashboard KPIs, charts, and widgets
"""
from datetime import datetime
from bson import ObjectId
from database.database import db
from utils.date_helpers import get_date_range, get_previous_period, group_by_interval
from utils.aggregation_pipelines import (
    build_kpi_pipeline,
    build_category_pipeline,
    build_timeline_pipeline,
    build_payment_method_pipeline,
    build_monthly_savings_pipeline,
    build_highest_expense_pipeline,
    build_recent_transactions_pipeline
)
from typing import Dict, Any, List


class DashboardService:
    """Dashboard analytics and data aggregation"""
    
    @staticmethod
    async def get_kpis(user_id: str, filter_type: str, start_date: datetime = None, end_date: datetime = None, kpi_type: str = None) -> Dict[str, Any]:
        """Calculate all KPIs with period comparison (optionally filtered by type)"""
        # Get current period
        current_start, current_end = get_date_range(filter_type, start_date, end_date)
        
        # Get previous period for comparison
        previous_start, previous_end = get_previous_period(current_start, current_end)
        
        # Initialize results
        kpis = {}
        
        # Helper to decide if we should calculate a specific KPI
        should_calc_all = kpi_type is None
        
        # We need basic stats for most KPIs anyway, but we can optimize return structure
        # actually, calculating everything is likely fast enough, but let's be explicit for structure
        
        current_stats = await DashboardService._calculate_period_stats(user_id, current_start, current_end)
        previous_stats = await DashboardService._calculate_period_stats(user_id, previous_start, previous_end)
        
        if should_calc_all or kpi_type == 'income':
            kpis["total_credits"] = DashboardService._build_kpi_comparison(
                current_stats["total_credits"],
                previous_stats["total_credits"],
                current_stats["credit_stats"]
            )
            
        if should_calc_all or kpi_type == 'expense':
            kpis["total_debits"] = DashboardService._build_kpi_comparison(
                current_stats["total_debits"],
                previous_stats["total_debits"],
                current_stats["debit_stats"]
            )
            # These are usually associated with expense view in dashboard
            kpis["highest_expense_category"] = current_stats["highest_category"]
            kpis["average_monthly_expense"] = DashboardService._build_kpi_comparison(
                current_stats["avg_monthly_expense"],
                previous_stats["avg_monthly_expense"]
            )
            
        if should_calc_all or kpi_type == 'balance':
            kpis["net_balance"] = DashboardService._build_kpi_comparison(
                current_stats["net_balance"],
                previous_stats["net_balance"]
            )
            kpis["available_balance"] = await DashboardService._calculate_total_balance(user_id)
            
        if should_calc_all or kpi_type == 'transactions':
            kpis["total_transactions"] = DashboardService._build_kpi_comparison(
                current_stats["transaction_count"],
                previous_stats["transaction_count"]
            )
            
        # If specific type requested, we might want to ensure other keys exist as null or handle in frontend
        # For simplicity in frontend merge, we return only what changed.
        
        return kpis

    @staticmethod
    async def _calculate_total_balance(user_id: str) -> float:
        """Calculate total wallet balance (all-time)"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": "$type",
                "total": {"$sum": "$amount"}
            }}
        ]
        result = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        credits = 0
        debits = 0
        
        for item in result:
            key = str(item["_id"]).lower()
            if key == "credit":
                credits = item["total"]
            elif key == "debit":
                debits = item["total"]
                
        return round(credits - debits, 2)
    
    @staticmethod
    async def _calculate_period_stats(user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate statistics for a period"""
        # Use aggregation pipeline
        pipeline_result = await db.transactions.aggregate(
            build_kpi_pipeline(user_id, start_date, end_date)
        ).to_list(length=None)
        
        # Process results
        total_credits = 0
        total_debits = 0
        transaction_count = 0
        credit_stats = {"min": 0, "max": 0}
        debit_stats = {"min": 0, "max": 0}
        
        for item in pipeline_result:
            key = str(item["_id"]).lower()
            if key == "credit":
                total_credits = item["total"]
                transaction_count += item["count"]
                credit_stats = {"min": item.get("min_transaction", 0), "max": item.get("max_transaction", 0)}
            elif key == "debit":
                total_debits = item["total"]
                transaction_count += item["count"]
                debit_stats = {"min": item.get("min_transaction", 0), "max": item.get("max_transaction", 0)}
        
        net_balance = total_credits - total_debits
        
        # Get category breakdown for highest category
        category_pipeline = build_category_pipeline(user_id, start_date, end_date, "debit")
        categories = await db.transactions.aggregate(category_pipeline).to_list(length=1)
        
        highest_category = {
            "current": categories[0]["_id"] if categories else "N/A",
            "amount": categories[0]["total"] if categories else 0
        }
        
        # Calculate average monthly expense
        period_days = (end_date - start_date).days + 1
        months = period_days / 30.0
        avg_monthly_expense = total_debits / months if months > 0 else total_debits
        
        return {
            "total_credits": total_credits,
            "total_debits": total_debits,
            "net_balance": net_balance,
            "transaction_count": transaction_count,
            "highest_category": highest_category,
            "avg_monthly_expense": avg_monthly_expense,
            "credit_stats": credit_stats,
            "debit_stats": debit_stats
        }
    
    @staticmethod
    def _build_kpi_comparison(current: float, previous: float, extra_stats: Dict[str, float] = None) -> Dict[str, Any]:
        """Build KPI with comparison"""
        if previous == 0:
            change_percent = 100.0 if current > 0 else 0.0
        else:
            change_percent = ((current - previous) / previous) * 100
        
        trend = "up" if change_percent > 0 else ("down" if change_percent < 0 else "neutral")
        
        result = {
            "current": round(current, 2),
            "previous": round(previous, 2),
            "change_percent": round(change_percent, 1),
            "trend": trend
        }
        
        if extra_stats:
            result.update(extra_stats)
            
        return result
    
    @staticmethod
    async def get_charts(user_id: str, filter_type: str, start_date: datetime = None, end_date: datetime = None, chart_type: str = None) -> Dict[str, Any]:
        """Get all chart data (optionally filtered)"""
        current_start, current_end = get_date_range(filter_type, start_date, end_date)
        interval = group_by_interval(filter_type)
        
        should_calc_all = chart_type is None
        charts = {}
        
        # Credit vs Debit timeline
        if should_calc_all or chart_type == 'credit_vs_debit':
            charts["credit_vs_debit"] = await DashboardService._get_timeline_chart(user_id, current_start, current_end, interval)
        
        # Category breakdown
        if should_calc_all or chart_type == 'category_breakdown':
            charts["category_breakdown"] = await DashboardService._get_category_chart(user_id, current_start, current_end)
        
        # Expense distribution (pie chart)
        if should_calc_all or chart_type == 'expense_distribution':
            charts["expense_distribution"] = await DashboardService._get_expense_distribution(user_id, current_start, current_end)
        
        # Payment method distribution
        if should_calc_all or chart_type == 'payment_methods':
            charts["payment_methods"] = await DashboardService._get_payment_methods(user_id, current_start, current_end)
        
        return charts
    
    @staticmethod
    async def _get_timeline_chart(user_id: str, start_date: datetime, end_date: datetime, interval: str) -> List[Dict[str, Any]]:
        """Get credit vs debit timeline"""
        pipeline = build_timeline_pipeline(user_id, start_date, end_date, interval)
        results = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        # Group by date
        timeline_dict = {}
        for item in results:
            # Format date key
            if interval == "day":
                date_key = f"{item['_id']['date']['year']}-{item['_id']['date']['month']:02d}-{item['_id']['date']['day']:02d}"
            elif interval == "week":
                date_key = f"{item['_id']['date']['year']}-W{item['_id']['date']['week']:02d}"
            else:  # month
                date_key = f"{item['_id']['date']['year']}-{item['_id']['date']['month']:02d}"
            
            if date_key not in timeline_dict:
                timeline_dict[date_key] = {"date": date_key, "credits": 0, "debits": 0}
            
            
            type_key = str(item["_id"]["type"]).lower()
            if type_key == "credit":
                timeline_dict[date_key]["credits"] = round(item["amount"], 2)
            else:
                timeline_dict[date_key]["debits"] = round(item["amount"], 2)
        
        # Sort by date to calculate running balance
        sorted_timeline = sorted(timeline_dict.values(), key=lambda x: x["date"])
        
        # Calculate opening balance before the start date
        current_balance = await DashboardService._calculate_opening_balance(user_id, start_date)
        
        # Calculate cumulative balance
        for point in sorted_timeline:
            net_change = point["credits"] - point["debits"]
            current_balance += net_change
            point["balance"] = round(current_balance, 2)
        
        return sorted_timeline

    @staticmethod
    async def _calculate_opening_balance(user_id: str, before_date: datetime) -> float:
        """Calculate balance before a specific date"""
        pipeline = [
            {
                "$match": {
                    "user_id": ObjectId(user_id),
                    "date": {"$lt": before_date}
                }
            },
            {
                "$group": {
                    "_id": "$type",
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        result = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        credits = 0
        debits = 0
        
        for item in result:
            key = str(item["_id"]).lower()
            if key == "credit":
                credits = item["total"]
            elif key == "debit":
                debits = item["total"]
                
        return credits - debits
    
    @staticmethod
    async def _get_category_chart(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get category breakdown"""
        pipeline = build_category_pipeline(user_id, start_date, end_date, "debit")
        results = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        return [
            {
                "category": item["_id"],
                "amount": round(item["total"], 2),
                "count": item["count"]
            }
            for item in results
        ]
    
    @staticmethod
    async def _get_expense_distribution(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get expense distribution for pie chart"""
        pipeline = build_category_pipeline(user_id, start_date, end_date, "debit")
        results = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        total = sum(item["total"] for item in results)
        
        return [
            {
                "name": item["_id"],
                "value": round((item["total"] / total * 100), 1) if total > 0 else 0,
                "amount": round(item["total"], 2)
            }
            for item in results
        ]
    
    @staticmethod
    async def _get_payment_methods(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get payment method distribution"""
        pipeline = build_payment_method_pipeline(user_id, start_date, end_date)
        results = await db.transactions.aggregate(pipeline).to_list(length=None)
        
        return [
            {
                "payment_method": item["_id"],
                "amount": round(item["total"], 2),
                "count": item["count"]
            }
            for item in results
        ]
    
    @staticmethod
    async def get_widgets(user_id: str, filter_type: str = "month", start_date: datetime = None, end_date: datetime = None, widget_type: str = None) -> Dict[str, Any]:
        """Get all widget data (optionally filtered)"""
        current_start, current_end = get_date_range(filter_type, start_date, end_date)
        should_calc_all = widget_type is None
        widgets = {}
        
        # Recent transactions
        if should_calc_all or widget_type == 'recent_transactions':
            recent_pipeline = build_recent_transactions_pipeline(user_id, 10)
            recent = await db.transactions.aggregate(recent_pipeline).to_list(length=10)
            formatted_recent = []
            for t in recent:
                t["id"] = str(t.pop("_id"))
                t["user_id"] = str(t["user_id"])
                formatted_recent.append(t)
            widgets["recent_transactions"] = formatted_recent
        
        # Top categories
        if should_calc_all or widget_type == 'top_categories':
            top_categories_pipeline = build_category_pipeline(user_id, current_start, current_end, type_filter=None)
            top_categories = await db.transactions.aggregate(top_categories_pipeline).to_list(length=5)
            widgets["top_categories"] = [
                {"category": c["_id"], "amount": round(c["total"], 2), "count": c["count"]}
                for c in top_categories
            ]
        
        # Highest single expense
        if should_calc_all or widget_type == 'highest_expense':
            highest_pipeline = build_highest_expense_pipeline(user_id, current_start, current_end)
            highest = await db.transactions.aggregate(highest_pipeline).to_list(length=1)
            formatted_highest = None
            if highest:
                formatted_highest = highest[0].copy()
                formatted_highest["id"] = str(formatted_highest.pop("_id"))
                formatted_highest["user_id"] = str(formatted_highest["user_id"])
            widgets["highest_expense"] = formatted_highest
        
        # Monthly savings
        if should_calc_all or widget_type == 'monthly_savings':
            savings_pipeline = build_monthly_savings_pipeline(user_id, current_start, current_end)
            savings_data = await db.transactions.aggregate(savings_pipeline).to_list(length=None)
            widgets["monthly_savings"] = DashboardService._process_monthly_savings(savings_data)
        
        return widgets
    
    @staticmethod
    def _process_monthly_savings(savings_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process monthly savings data"""
        monthly_dict = {}
        
        for item in savings_data:
            month_key = f"{item['_id']['year']}-{item['_id']['month']:02d}"
            
            if month_key not in monthly_dict:
                monthly_dict[month_key] = {"month": month_key, "credits": 0, "debits": 0}
            
            type_key = str(item["_id"]["type"]).lower()
            if type_key == "credit":
                monthly_dict[month_key]["credits"] = round(item["amount"], 2)
            else:
                monthly_dict[month_key]["debits"] = round(item["amount"], 2)
        
        # Calculate savings
        for key in monthly_dict:
            monthly_dict[key]["savings"] = round(
                monthly_dict[key]["credits"] - monthly_dict[key]["debits"], 2
            )
        
        return sorted(monthly_dict.values(), key=lambda x: x["month"])
