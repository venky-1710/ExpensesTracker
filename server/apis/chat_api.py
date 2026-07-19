"""
Chat API - AI chatbot business logic using Gemini.
"""
import os
import json
import google.generativeai as genai
from apis.dashboard_api import DashboardAPI
from apis.transaction_api import TransactionAPI
from apis.calendar_api import get_user_events
from apis.timesheet_api import TimesheetAPI
from models.payloads import TransactionFilter, PaginationParams
import traceback
from datetime import datetime
from database.database import db
from bson import ObjectId
from utils.logger import logger
import uuid


# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# System Prompt
SYSTEM_PROMPT = """
You are WeBot, a helpful AI Financial & Productivity Assistant for the Expenses Tracker application.
Your sole purpose is to help the user understand their financial data, expenses, income, budgets, timesheets, and calendar events.

ABSOLUTE STRICT RULES - VIOLATION IS UNACCEPTABLE:
1. You must ONLY answer questions directly related to personal finance, expenses, income, budgets, timesheets, calendar events, or savings.
2. If the user asks about ANYTHING ELSE (e.g., coding, jokes, writing poems, general knowledge, history, recipes, etc.), you MUST reply with exactly:
   "I am specialized solely in assisting with your financial data, schedules, and timesheets. I cannot help with that topic."
3. You have access to the user's current context (KPIs, recent transactions, calendar events, and timesheets) in JSON format. Use this data strictly to answer questions like "How much did I spend?", "What are my upcoming events?", or "How many hours did I log?".
4. Always respond concisely, professionally, and warmly.
5. Do NOT provide generic knowledge if it doesn't tie into personal finance.
6. Format currency in Indian Rupees (₹).
7. INTERACTIVE CHARTS: If the user asks to see a chart, graph, or visual breakdown of their data, you MUST include a specific tag in your response. The frontend will parse this tag and render a beautiful interactive chart!
   - To show a Category pie chart (expenses by category), output exactly: `[CHART:category_breakdown]`
   - To show an Income vs Expense bar chart, output exactly: `[CHART:income_expense]`
   - To show a Spending Trends area chart over time, output exactly: `[CHART:spending_trends]`
   *Example*: "Here is the visual breakdown of your expenses by category: \n\n[CHART:category_breakdown]\n\nLet me know if you need more details!"
"""


async def get_chat_history(user_id: str, limit: int = 200) -> list:
    """Fetch chat history for the user, grouped by thread_id, limited to recent messages."""
    try:
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$sort": {"created_at": -1}},
            {"$limit": limit}
        ]
        history = await db.chat_history.aggregate(pipeline).to_list(length=None)
        history.reverse()
        
        # Group by thread_id
        threads_map = {}
        thread_titles = {}
        for msg in history:
            tid = msg.get("thread_id", "default")
            if tid not in threads_map:
                threads_map[tid] = []
                
            if msg.get("title"):
                thread_titles[tid] = msg.get("title")
                
            threads_map[tid].append({
                "role": msg["role"],
                "content": msg["content"],
                "created_at": msg["created_at"].isoformat()
            })
        
        # Convert to list of threads, sorted by most recent message within
        threads = []
        for tid, msgs in threads_map.items():
            if not msgs: continue
            # Make sure it's parsed as UTC in UI by appending Z if missing
            for m in msgs:
                if not m["created_at"].endswith("Z"):
                    m["created_at"] += "Z"
                    
            last_msg_time = msgs[-1]["created_at"]
            threads.append({
                "thread_id": tid,
                "title": thread_titles.get(tid),
                "messages": msgs,
                "last_updated": last_msg_time
            })
            
        # Sort threads so newest threads are first
        threads.sort(key=lambda x: x["last_updated"], reverse=True)
        return threads
    except Exception as e:
        logger.error(f"[ERROR] get_chat_history - user_id={user_id}: {str(e)}")
        return []

async def update_thread_title(user_id: str, thread_id: str, title: str) -> bool:
    """Updates the explicit title for all messages grouped by thread_id."""
    try:
        query = {"user_id": ObjectId(user_id)}
        if thread_id == "default":
            query["$or"] = [{"thread_id": {"$exists": False}}, {"thread_id": "default"}]
        else:
            query["thread_id"] = thread_id
            
        result = await db.chat_history.update_many(
            query,
            {"$set": {"title": title}}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"[ERROR] update_thread_title - user_id={user_id}, thread_id={thread_id}: {str(e)}")
        return False

async def delete_thread(user_id: str, thread_id: str) -> bool:
    """Permanently deletes a chat thread from history."""
    try:
        query = {"user_id": ObjectId(user_id)}
        if thread_id == "default":
            query["$or"] = [{"thread_id": {"$exists": False}}, {"thread_id": "default"}]
        else:
            query["thread_id"] = thread_id
            
        result = await db.chat_history.delete_many(query)
        return result.deleted_count > 0
    except Exception as e:
        logger.error(f"[ERROR] delete_thread - user_id={user_id}, thread_id={thread_id}: {str(e)}")
        return False


async def generate_chat_response(user_id: str, message: str, thread_id: str = None):
    """Generate AI chat response with financial context, leveraging stateless DB history."""
    try:
        logger.info(f"[CHAT] Generating response for user_id={user_id}")
        
        if not thread_id:
            thread_id = str(uuid.uuid4())

        if not GENAI_API_KEY:
            logger.error("[CHAT] GEMINI_API_KEY is not configured")
            return "AI Chat is not configured. Please set GEMINI_API_KEY in server environment.", thread_id

        # Save user message immediately
        user_msg_doc = {
            "user_id": ObjectId(user_id),
            "thread_id": thread_id,
            "role": "user",
            "content": message,
            "created_at": datetime.utcnow()
        }
        await db.chat_history.insert_one(user_msg_doc)

        # 1. Fetch Context
        logger.info(f"[CHAT] Fetching financial context for user_id={user_id}")
        current_month_kpis = await DashboardAPI.get_kpis(user_id, "month")
        all_time_kpis = await DashboardAPI.get_kpis(user_id, "all")
        charts_data = await DashboardAPI.get_charts(user_id, "all")
        
        filters = TransactionFilter()
        pagination = PaginationParams(page=1, limit=10)
        transactions_data = await TransactionAPI.list_transactions(user_id, filters, pagination)
        transactions = transactions_data.get("transactions", [])
        
        calendar_events = await get_user_events(user_id)
        timesheets_data = await TimesheetAPI.get_timesheets(user_id, page=1, limit=20)
        timesheets = timesheets_data.get("timesheets", [])

        # Prepare Context String
        context_data = {
            "current_month_kpis": current_month_kpis,
            "all_time_kpis": all_time_kpis,
            "charts_data": charts_data,
            "recent_top_10_transactions": [
                {
                    "date": t["date"].isoformat() + "Z" if hasattr(t["date"], "isoformat") else t["date"],
                    "amount": t["amount"],
                    "type": t["type"],
                    "category": t["category"],
                    "description": t.get("description", "")
                } for t in transactions
            ],
            "calendar_events": [
                {
                    "title": e.get("title"),
                    "start_time": e.get("start_time"),
                    "end_time": e.get("end_time"),
                    "status": e.get("status"),
                    "amount": e.get("amount")
                } for e in calendar_events[-20:]
            ],
            "recent_timesheets": [
                {
                    "date": t.get("date"),
                    "work_code": t.get("work_code"),
                    "hours": t.get("hours"),
                    "notes": t.get("notes")
                } for t in timesheets
            ]
        }
        context_str = json.dumps(context_data, default=str)

        # 2. Fetch past History from DB
        db_history_threads = await get_chat_history(user_id, limit=200)
        
        # Find exactly the thread we are working in
        current_thread_msgs = []
        for t in db_history_threads:
            if t["thread_id"] == thread_id:
                current_thread_msgs = t["messages"]
                break
        
        # 3. Model Init & Setup
        model = genai.GenerativeModel('gemini-flash-latest')
        full_history = [
            {"role": "user", "parts": [f"{SYSTEM_PROMPT}\n\nUSER CONTEXT:\n{context_str}"]},
            {"role": "model", "parts": ["Understood. I am ready to assist with financial queries based on this data."]}
        ]

        # Inject past up to the message we just saved
        for msg in current_thread_msgs[:-1]: # exclude the one we just saved to send it as the prompt
            role = "user" if msg["role"] == "user" else "model"
            full_history.append({"role": role, "parts": [msg["content"]]})

        # 4. Generate Response
        logger.info(f"[CHAT] Sending message to Gemini for thread {thread_id}")
        chat = model.start_chat(history=full_history)
        response = chat.send_message(message)
        logger.info("[CHAT] Response received from Gemini")

        # Save model message
        model_msg_doc = {
            "user_id": ObjectId(user_id),
            "thread_id": thread_id,
            "role": "model",
            "content": response.text,
            "created_at": datetime.utcnow()
        }
        await db.chat_history.insert_one(model_msg_doc)

        return response.text, thread_id

    except Exception as e:
        logger.error(f"[ERROR] generate_chat_response - user_id={user_id}: {str(e)}")
        logger.error(f"[TRACEBACK] {traceback.format_exc()}")
        raise e
