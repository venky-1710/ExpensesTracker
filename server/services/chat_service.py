import google.generativeai as genai
import os
import json
from services.dashboard_service import DashboardService
from services.transaction_service import TransactionService
from models.payloads import TransactionFilter, PaginationParams


# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# System Prompt
SYSTEM_PROMPT = """
You are a helpful Financial Assistant for the Expenses Tracker application. 
Your goal is to help users understand their financial data, including expenses, income, and balance trends.

RULES:
1. You must ONLY answer questions related to the user's finances, expenses, income, budget, or financial advice.
2. If the user asks about anything else (e.g., "write a poem", "who is the president", "coding help"), you must politely refuse: "I can only assist you with financial queries related to your Expenses Tracker data."
3. You have access to the user's current financial context (KPIs and recent transactions) in JSON format. Use this data to answer specific questions like "How much did I spend?" or "What is my balance?".
4. Be concise, professional, and encouraging.
5. Format currency in Indian Rupees (₹).
"""

from utils.logger import logger

async def generate_chat_response(user_id: str, message: str, history: list = []):
    logger.info(f"DEBUG: generate_chat_response called for user {user_id}")
    if not GENAI_API_KEY:
        logger.error("DEBUG: GENAI_API_KEY is missing")
        return "AI Chat is not configured. Please set GEMINI_API_KEY in server environment."

    try:
        # 1. Fetch Context
        logger.info("DEBUG: Fetching KPIs...")
        # Get KPIs (default to 'month' context)
        kpis = await DashboardService.get_kpis(user_id, "month")
        logger.info(f"DEBUG: KPIs fetched: {kpis.keys()}")
        
        # Get Recent Transactions (last 10)
        logger.info("DEBUG: Fetching Transactions...")
        filters = TransactionFilter()
        pagination = PaginationParams(page=1, limit=10)
        transactions_data = await TransactionService.list_transactions(user_id, filters, pagination)
        transactions = transactions_data.get("transactions", [])
        logger.info(f"DEBUG: Transactions fetched: {len(transactions)}")
        
        # Prepare Context String
        context_data = {
            "kpis": kpis,
            "recent_transactions": [
                {
                    "date": t["date"], 
                    "amount": t["amount"], 
                    "type": t["type"], 
                    "category": t["category"], 
                    "description": t.get("description", "")
                } for t in transactions
            ]
        }
        
        context_str = json.dumps(context_data, default=str)

        # 2. Initialize Model
        logger.info("DEBUG: Initializing Gemini Model...")
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # 3. Construct Chat History
        # Start with System Prompt + Context
        full_history = [
            {"role": "user", "parts": [f"{SYSTEM_PROMPT}\n\nUSER CONTEXT:\n{context_str}"]},
            {"role": "model", "parts": ["Understood. I am ready to assist with financial queries based on this data."]}
        ]
        
        # Add User History (mapped to Gemini format)
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            full_history.append({"role": role, "parts": [msg.get("content", "")]})
        
        # 4. Generate Response
        logger.info("DEBUG: Sending message to Gemini...")
        chat = model.start_chat(history=full_history)
        response = chat.send_message(message)
        logger.info("DEBUG: Gemini response received")
        
        return response.text
    except Exception as e:
        logger.error(f"DEBUG: User ID: {user_id}")
        logger.error(f"DEBUG: Error in generate_chat_response: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise e
