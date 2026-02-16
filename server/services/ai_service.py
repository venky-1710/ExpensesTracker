import os
import json
import google.generativeai as genai
import pandas as pd
import pdfplumber
from datetime import datetime
from typing import List, Dict, Any
from io import BytesIO
from dotenv import load_dotenv
from utils.logger import logger

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    text = ""
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def extract_text_from_excel(file_bytes: bytes) -> str:
    """Extract text from an Excel/CSV file."""
    try:
        df = pd.read_excel(BytesIO(file_bytes))
    except Exception:
        df = pd.read_csv(BytesIO(file_bytes))
    return df.to_string()


async def analyze_statement(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Analyzes the uploaded bank statement file using Gemini AI
    to extract transaction details.
    """
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not set.")

    # 1. Extract Text based on file type
    if filename.lower().endswith('.pdf'):
        text_data = extract_text_from_pdf(file_content)
    elif filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        text_data = extract_text_from_excel(file_content)
    else:
        raise ValueError("Unsupported file format. Please upload PDF, Excel, or CSV.")

    logger.info(f"📄 Extracted {len(text_data)} characters from {filename}")

    if not text_data.strip():
        raise ValueError("Could not extract any text from the uploaded file.")

    # 2. Prompt Engineering
    prompt = f"""
    You are an intelligent financial assistant. I will provide you with text extracted from a bank statement or transaction file.
    Your task is to identify and extract all financial transactions from this text.

    For each transaction, extract:
    - date: The date of the transaction in ISO 8601 format (YYYY-MM-DD). If the year is missing, assume the current year {datetime.now().year}.
    - description: A brief description or payee name. Clean up extra whitespace or codes.
    - amount: The absolute numeric value of the transaction (positive float).
    - type: 'credit' if it is a deposit/income, 'debit' if it is a withdrawal/expense.
    - category: Make an educated guess for the category based on the description (e.g., 'Groceries', 'Rent', 'Salary', 'Utilities', 'Entertainment', 'Dining', 'Shopping', 'Transfer', 'Other').

    Return the output ONLY as a valid JSON array of objects. Do not include markdown formatting (like ```json).
    
    Example Output:
    [{{"date": "2023-10-15", "description": "Starbucks Coffee", "amount": 5.50, "type": "debit", "category": "Dining"}},
     {{"date": "2023-10-16", "description": "Salary Deposit", "amount": 3000.00, "type": "credit", "category": "Salary"}}]

    Here is the text content:
    {text_data[:20000]}
    """

    try:
        # 3. Call Gemini
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(prompt)

        response_text = response.text.strip()
        logger.info(f"🤖 RAW AI RESPONSE: {response_text[:500]}...")

        # 4. Clean up response - remove markdown code fences if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # 5. Parse JSON
        transactions = json.loads(response_text)
        logger.info(f"✅ Parsed {len(transactions)} transactions from AI response")
        return transactions

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON Decode Error: {e}")
        logger.error(f"❌ Invalid JSON content: {response_text}")
        raise ValueError("Failed to parse transactions using AI. The model response was not valid JSON.")
    except Exception as e:
        logger.error(f"❌ Gemini API Error: {str(e)}")
        raise
