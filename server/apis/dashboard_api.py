"""
Dashboard API - Analytics, KPIs, charts, and widget business logic.
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
from utils.helpers import format_transaction_doc
from utils.logger import logger
from typing import Dict, Any, List
import traceback


class DashboardAPI:
    """Dashboard analytics and data aggregation."""

    @staticmethod
    async def get_kpis(
        user_id: str,
        filter_type: str,
        start_date: datetime = None,
        end_date: datetime = None,
        kpi_type: str = None
    ) -> Dict[str, Any]:
        """Calculate all KPIs with period comparison."""
        try:
            logger.info(f"[DASHBOARD] KPIs request - user_id={user_id}, filter={filter_type}, kpi_type={kpi_type}")

            current_start, current_end = get_date_range(filter_type, start_date, end_date)
            previous_start, previous_end = get_previous_period(current_start, current_end)

            kpis = {}
            should_calc_all = kpi_type is None

            current_stats = await DashboardAPI._calculate_period_stats(user_id, current_start, current_end)
            previous_stats = await DashboardAPI._calculate_period_stats(user_id, previous_start, previous_end)

            # Fetch sparklines (daily totals over current period)
            sparklines = await DashboardAPI._get_sparklines(user_id, current_start, current_end)

            if should_calc_all or kpi_type == 'income':
                kpis["total_credits"] = DashboardAPI._build_kpi_comparison(
                    current_stats["total_credits"],
                    previous_stats["total_credits"],
                    current_stats["credit_stats"],
                    sparkline=sparklines.get("credit", [])
                )

            if should_calc_all or kpi_type == 'expense':
                kpis["total_debits"] = DashboardAPI._build_kpi_comparison(
                    current_stats["total_debits"],
                    previous_stats["total_debits"],
                    current_stats["debit_stats"],
                    sparkline=sparklines.get("debit", [])
                )
                kpis["highest_expense_category"] = current_stats["highest_category"]
                kpis["average_monthly_expense"] = DashboardAPI._build_kpi_comparison(
                    current_stats["avg_monthly_expense"],
                    previous_stats["avg_monthly_expense"]
                )

            if should_calc_all or kpi_type == 'balance':
                balance_sparkline = [
                    round(c - d, 2)
                    for c, d in zip(sparklines.get("credit", []), sparklines.get("debit", []))
                ]
                kpis["net_balance"] = DashboardAPI._build_kpi_comparison(
                    current_stats["net_balance"],
                    previous_stats["net_balance"],
                    sparkline=balance_sparkline
                )
                kpis["available_balance"] = await DashboardAPI._calculate_total_balance(user_id)

            if should_calc_all or kpi_type == 'transactions':
                kpis["total_transactions"] = DashboardAPI._build_kpi_comparison(
                    current_stats["transaction_count"],
                    previous_stats["transaction_count"],
                    sparkline=sparklines.get("transactions", [])
                )

            logger.info(f"[DASHBOARD] KPIs returned successfully for user_id={user_id}")
            return kpis

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI.get_kpis - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    async def _calculate_total_balance(user_id: str) -> float:
        """Calculate total wallet balance (all-time)."""
        try:
            pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
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

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._calculate_total_balance - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return 0.0

    @staticmethod
    async def _calculate_period_stats(user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate statistics for a period."""
        try:
            pipeline_result = await db.transactions.aggregate(
                build_kpi_pipeline(user_id, start_date, end_date)
            ).to_list(length=None)

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

            # Get highest category
            category_pipeline = build_category_pipeline(user_id, start_date, end_date, "debit")
            categories = await db.transactions.aggregate(category_pipeline).to_list(length=1)

            highest_category = {
                "current": categories[0]["_id"] if categories else "N/A",
                "amount": categories[0]["total"] if categories else 0
            }

            # Average monthly expense
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

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._calculate_period_stats - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return {
                "total_credits": 0, "total_debits": 0, "net_balance": 0,
                "transaction_count": 0, "highest_category": {"current": "N/A", "amount": 0},
                "avg_monthly_expense": 0, "credit_stats": {"min": 0, "max": 0},
                "debit_stats": {"min": 0, "max": 0}
            }

    @staticmethod
    def _build_kpi_comparison(
        current: float,
        previous: float,
        extra_stats: Dict[str, float] = None,
        sparkline: List[float] = None
    ) -> Dict[str, Any]:
        """Build KPI with comparison and sparkline."""
        try:
            if previous == 0:
                change_percent = 100.0 if current > 0 else 0.0
            else:
                change_percent = ((current - previous) / previous) * 100

            trend = "up" if change_percent > 0 else ("down" if change_percent < 0 else "neutral")

            result = {
                "current": round(current, 2),
                "previous": round(previous, 2),
                "change_percent": round(change_percent, 1),
                "trend": trend,
                "sparkline": sparkline or []
            }

            if extra_stats:
                result.update(extra_stats)

            return result

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._build_kpi_comparison - {str(e)}")
            return {"current": 0, "previous": 0, "change_percent": 0, "trend": "neutral", "sparkline": []}

    @staticmethod
    async def _get_sparklines(user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, List[float]]:
        """Get daily totals grouped by type for sparkline charts."""
        try:
            pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "date": {"$gte": start_date, "$lte": end_date}
                }},
                {"$group": {
                    "_id": {
                        "type": "$type",
                        "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}
                    },
                    "total": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id.day": 1}}
            ]

            results = await db.transactions.aggregate(pipeline).to_list(length=None)

            credits_by_day = {}
            debits_by_day = {}
            txn_by_day = {}

            for item in results:
                day = item["_id"]["day"]
                type_key = str(item["_id"]["type"]).lower()
                if type_key == "credit":
                    credits_by_day[day] = round(item["total"], 2)
                elif type_key == "debit":
                    debits_by_day[day] = round(item["total"], 2)
                txn_by_day[day] = txn_by_day.get(day, 0) + item["count"]

            all_days = sorted(set(list(credits_by_day.keys()) + list(debits_by_day.keys())))

            return {
                "credit": [credits_by_day.get(d, 0) for d in all_days],
                "debit": [debits_by_day.get(d, 0) for d in all_days],
                "transactions": [txn_by_day.get(d, 0) for d in all_days]
            }

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._get_sparklines - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return {"credit": [], "debit": [], "transactions": []}

    @staticmethod
    async def get_charts(
        user_id: str,
        filter_type: str,
        start_date: datetime = None,
        end_date: datetime = None,
        chart_type: str = None,
        granularity: str = None
    ) -> Dict[str, Any]:
        """Get all chart data."""
        try:
            logger.info(f"[DASHBOARD] Charts request - user_id={user_id}, filter={filter_type}, type={chart_type}")

            current_start, current_end = get_date_range(filter_type, start_date, end_date)
            
            # Map granularity to interval string
            granularity_map = {
                "daily": "day",
                "weekly": "week",
                "monthly": "month",
                "quarterly": "quarter",
                "yearly": "year"
            }
            if granularity and granularity in granularity_map:
                interval = granularity_map[granularity]
            else:
                interval = group_by_interval(filter_type)

            should_calc_all = chart_type is None
            charts = {}

            if should_calc_all or chart_type == 'credit_vs_debit':
                charts["credit_vs_debit"] = await DashboardAPI._get_timeline_chart(user_id, current_start, current_end, interval)

            if should_calc_all or chart_type == 'category_breakdown':
                charts["category_breakdown"] = await DashboardAPI._get_category_chart(user_id, current_start, current_end)

            if should_calc_all or chart_type == 'expense_distribution':
                charts["expense_distribution"] = await DashboardAPI._get_expense_distribution(user_id, current_start, current_end)

            if should_calc_all or chart_type == 'payment_methods':
                charts["payment_methods"] = await DashboardAPI._get_payment_methods(user_id, current_start, current_end)

            logger.info(f"[DASHBOARD] Charts returned successfully for user_id={user_id}")
            return charts

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI.get_charts - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    async def _get_timeline_chart(user_id: str, start_date: datetime, end_date: datetime, interval: str) -> List[Dict[str, Any]]:
        """Get credit vs debit timeline."""
        try:
            pipeline = build_timeline_pipeline(user_id, start_date, end_date, interval)
            results = await db.transactions.aggregate(pipeline).to_list(length=None)

            timeline_dict = {}
            for item in results:
                if interval == "day":
                    date_key = f"{item['_id']['date']['year']}-{item['_id']['date']['month']:02d}-{item['_id']['date']['day']:02d}"
                elif interval == "week":
                    date_key = f"{item['_id']['date']['year']}-W{item['_id']['date']['week']:02d}"
                elif interval == "quarter":
                    date_key = f"{item['_id']['date']['year']}-Q{int(item['_id']['date']['quarter'])}"
                elif interval == "year":
                    date_key = f"{item['_id']['date']['year']}"
                else:
                    # month
                    date_key = f"{item['_id']['date']['year']}-{item['_id']['date']['month']:02d}"

                if date_key not in timeline_dict:
                    timeline_dict[date_key] = {"date": date_key, "credits": 0, "debits": 0}

                type_key = str(item["_id"]["type"]).lower()
                if type_key == "credit":
                    timeline_dict[date_key]["credits"] = round(item["amount"], 2)
                else:
                    timeline_dict[date_key]["debits"] = round(item["amount"], 2)

            sorted_timeline = sorted(timeline_dict.values(), key=lambda x: x["date"])

            current_balance = await DashboardAPI._calculate_opening_balance(user_id, start_date)

            for point in sorted_timeline:
                net_change = point["credits"] - point["debits"]
                current_balance += net_change
                point["balance"] = round(current_balance, 2)

            return sorted_timeline

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._get_timeline_chart - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return []

    @staticmethod
    async def _calculate_opening_balance(user_id: str, before_date: datetime) -> float:
        """Calculate balance before a specific date."""
        try:
            pipeline = [
                {"$match": {"user_id": ObjectId(user_id), "date": {"$lt": before_date}}},
                {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
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

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._calculate_opening_balance - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return 0.0

    @staticmethod
    async def _get_category_chart(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get category breakdown."""
        try:
            pipeline = build_category_pipeline(user_id, start_date, end_date, "debit")
            results = await db.transactions.aggregate(pipeline).to_list(length=None)

            return [
                {"category": item["_id"], "amount": round(item["total"], 2), "count": item["count"]}
                for item in results
            ]

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._get_category_chart - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return []

    @staticmethod
    async def _get_expense_distribution(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get expense distribution for pie chart."""
        try:
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

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._get_expense_distribution - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return []

    @staticmethod
    async def _get_payment_methods(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get payment method distribution."""
        try:
            pipeline = build_payment_method_pipeline(user_id, start_date, end_date)
            results = await db.transactions.aggregate(pipeline).to_list(length=None)

            return [
                {"payment_method": item["_id"], "amount": round(item["total"], 2), "count": item["count"]}
                for item in results
            ]

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._get_payment_methods - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return []

    @staticmethod
    async def get_widgets(
        user_id: str,
        filter_type: str = "month",
        start_date: datetime = None,
        end_date: datetime = None,
        widget_type: str = None
    ) -> Dict[str, Any]:
        """Get all widget data."""
        try:
            logger.info(f"[DASHBOARD] Widgets request - user_id={user_id}, filter={filter_type}, type={widget_type}")

            current_start, current_end = get_date_range(filter_type, start_date, end_date)
            should_calc_all = widget_type is None
            widgets = {}

            # Recent transactions
            if should_calc_all or widget_type == 'recent_transactions':
                recent_pipeline = build_recent_transactions_pipeline(user_id, 10)
                recent = await db.transactions.aggregate(recent_pipeline).to_list(length=10)
                widgets["recent_transactions"] = [format_transaction_doc(t) for t in recent]

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
                    formatted_highest = format_transaction_doc(highest[0].copy())
                widgets["highest_expense"] = formatted_highest

            # Monthly savings
            if should_calc_all or widget_type == 'monthly_savings':
                savings_pipeline = build_monthly_savings_pipeline(user_id, current_start, current_end)
                savings_data = await db.transactions.aggregate(savings_pipeline).to_list(length=None)
                widgets["monthly_savings"] = DashboardAPI._process_monthly_savings(savings_data)

            logger.info(f"[DASHBOARD] Widgets returned successfully for user_id={user_id}")
            return widgets

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI.get_widgets - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    def _process_monthly_savings(savings_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process monthly savings data."""
        try:
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

            for key in monthly_dict:
                monthly_dict[key]["savings"] = round(
                    monthly_dict[key]["credits"] - monthly_dict[key]["debits"], 2
                )

            return sorted(monthly_dict.values(), key=lambda x: x["month"])

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI._process_monthly_savings - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return []

    @staticmethod
    async def get_spending_trend(
        user_id: str,
        year: int,
        period: str = "months"  # "months" or "quarters"
    ) -> Dict[str, Any]:
        """Get spending trend (income vs expenses) grouped by month or quarter for a given year."""
        try:
            logger.info(f"[DASHBOARD] SpendingTrend - user_id={user_id}, year={year}, period={period}")

            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31, 23, 59, 59)

            MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"]

            pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "date": {"$gte": start_date, "$lte": end_date}
                }},
                {"$group": {
                    "_id": {
                        "type": "$type",
                        "month": {"$month": "$date"}
                    },
                    "total": {"$sum": "$amount"}
                }},
                {"$sort": {"_id.month": 1}}
            ]

            results = await db.transactions.aggregate(pipeline).to_list(length=None)

            # Build month-indexed dicts
            income_by_month = {m: 0.0 for m in range(1, 13)}
            expense_by_month = {m: 0.0 for m in range(1, 13)}

            for item in results:
                m = item["_id"]["month"]
                t = str(item["_id"]["type"]).lower()
                if t == "credit":
                    income_by_month[m] = round(item["total"], 2)
                elif t == "debit":
                    expense_by_month[m] = round(item["total"], 2)

            if period == "quarters":
                labels = QUARTER_LABELS
                quarter_map = {"Q1": [1,2,3], "Q2": [4,5,6], "Q3": [7,8,9], "Q4": [10,11,12]}
                income_data  = [round(sum(income_by_month[m]  for m in months), 2) for months in quarter_map.values()]
                expense_data = [round(sum(expense_by_month[m] for m in months), 2) for months in quarter_map.values()]
            else:
                labels = MONTH_LABELS
                income_data  = [income_by_month[m]  for m in range(1, 13)]
                expense_data = [expense_by_month[m] for m in range(1, 13)]

            return {
                "year": year,
                "period": period,
                "labels": labels,
                "series": [
                    {"name": "Income",   "data": income_data,  "color": "#10b981"},
                    {"name": "Expenses", "data": expense_data, "color": "#ef4444"}
                ]
            }

        except Exception as e:
            logger.error(f"[ERROR] DashboardAPI.get_spending_trend - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise
