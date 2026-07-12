"""
Upload API - File upload, AI analysis, and transaction import logic.
"""
import os
import json
import google.generativeai as genai
import pandas as pd
import pdfplumber
from datetime import datetime
from typing import List, Dict, Any
from io import BytesIO
from bson import ObjectId
from fastapi import HTTPException
from database.database import db
from apis.cache_api import cache_service
from utils.logger import logger
import traceback


# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class UploadAPI:
    """File upload and AI analysis business logic."""

    @staticmethod
    def _extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extract text from a PDF file."""
        try:
            text = ""
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except Exception as e:
            logger.error(f"[ERROR] UploadAPI._extract_text_from_pdf - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    def _extract_text_from_excel(file_bytes: bytes) -> str:
        """Extract text from an Excel/CSV file."""
        try:
            try:
                df = pd.read_excel(BytesIO(file_bytes))
            except Exception:
                df = pd.read_csv(BytesIO(file_bytes))
            return df.to_string()
        except Exception as e:
            logger.error(f"[ERROR] UploadAPI._extract_text_from_excel - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    async def analyze_statement(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
        """Analyze uploaded bank statement using Gemini AI."""
        try:
            logger.info(f"[UPLOAD] Analyzing file: {filename}")

            if not GEMINI_API_KEY:
                raise Exception("GEMINI_API_KEY is not set.")

            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                text_data = UploadAPI._extract_text_from_pdf(file_content)
            elif filename.lower().endswith(('.xlsx', '.xls', '.csv')):
                text_data = UploadAPI._extract_text_from_excel(file_content)
            else:
                raise ValueError("Unsupported file format. Please upload PDF, Excel, or CSV.")

            logger.info(f"[UPLOAD] Extracted {len(text_data)} characters from {filename}")

            if not text_data.strip():
                raise ValueError("Could not extract any text from the uploaded file.")

            # Prompt Engineering
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

            # Call Gemini
            logger.info("[UPLOAD] Sending to Gemini for analysis")
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content(prompt)

            response_text = response.text.strip()
            logger.info(f"[UPLOAD] AI response received, length={len(response_text)}")

            # Clean up response
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            # Parse JSON
            transactions = json.loads(response_text)
            logger.info(f"[UPLOAD] Parsed {len(transactions)} transactions from AI response")
            return transactions

        except json.JSONDecodeError as e:
            logger.error(f"[ERROR] UploadAPI.analyze_statement - JSON decode: {str(e)}")
            raise ValueError("Failed to parse transactions using AI. The model response was not valid JSON.")
        except Exception as e:
            logger.error(f"[ERROR] UploadAPI.analyze_statement - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    async def confirm_transactions(transactions: list, user_id: str) -> Dict[str, Any]:
        """Accept reviewed transactions and insert into database."""
        try:
            logger.info(f"[UPLOAD] Confirming {len(transactions)} transactions for user_id={user_id}")

            if not transactions:
                return {"message": "No transactions to import.", "count": 0}

            transactions_to_insert = []
            now = datetime.now()

            for item in transactions:
                # Parse date
                try:
                    parsed_date = datetime.fromisoformat(item.date)
                except ValueError:
                    parsed_date = datetime.strptime(item.date, "%Y-%m-%d")

                transaction = {
                    "user_id": ObjectId(user_id),
                    "amount": abs(item.amount),
                    "type": item.type.lower(),
                    "category": item.category.strip(),
                    "description": item.description.strip(),
                    "payment_method": "Other",
                    "date": parsed_date,
                    "created_at": now,
                    "updated_at": now
                }
                transactions_to_insert.append(transaction)

            result = await db.transactions.insert_many(transactions_to_insert)
            logger.info(f"[UPLOAD] Imported {len(result.inserted_ids)} transactions for user_id={user_id}")

            # Invalidate cache
            cache_service.invalidate_user_cache(user_id)

            return {
                "message": "Transactions imported successfully!",
                "count": len(result.inserted_ids)
            }

        except Exception as e:
            logger.error(f"[ERROR] UploadAPI.confirm_transactions - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def analyze_timesheets(file_content: bytes, filename: str, user_work_codes: List[str] = None) -> List[Dict[str, Any]]:
        """Analyze uploaded timesheet document using Gemini AI."""
        try:
            logger.info(f"[UPLOAD] Analyzing timesheet file: {filename}")

            if not GEMINI_API_KEY:
                raise Exception("GEMINI_API_KEY is not set.")

            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                text_data = UploadAPI._extract_text_from_pdf(file_content)
            elif filename.lower().endswith(('.xlsx', '.xls', '.csv')):
                text_data = UploadAPI._extract_text_from_excel(file_content)
            else:
                raise ValueError("Unsupported file format. Please upload PDF, Excel, or CSV.")

            logger.info(f"[UPLOAD] Extracted {len(text_data)} characters from {filename}")

            if not text_data.strip():
                raise ValueError("Could not extract any text from the uploaded file.")

            # Prompt Engineering
            work_code_instructions = ""
            if user_work_codes:
                work_code_instructions = f"Do NOT suggest or invent any new work codes. You MUST choose a company name/work code ONLY from this exact list: {user_work_codes}. If you cannot determine which one applies, or if none match, return an empty string ''."
            else:
                work_code_instructions = "Do NOT suggest any names. Return an empty string '' for the work code."

            prompt = f"""
            You are an intelligent timesheet assistant. I will provide you with text extracted from a timesheet, work log, or invoice document.
            The document will likely only contain a date and a description for each entry.
            Your task is to identify and extract all logged work sessions from this text.

            For each logged session, extract:
            - date: The date of the work session in DD-MM-YYYY format. If the year is missing, assume the current year {datetime.now().year}.
            - work_code: {work_code_instructions}
            - duration: The time spent on the task in decimal hours. The document will likely NOT specify this. Always set this to a default of 8.0 hours unless explicitly stated otherwise.
            - description: A brief summary of what was worked on.

            Return the output ONLY as a valid JSON array of objects. Do not include markdown formatting (like ```json).
            
            Example Output:
            [{{"date": "15-10-2023", "work_code": "", "duration": 8.0, "description": "Frontend development and code review"}},
             {{"date": "16-10-2023", "work_code": "", "duration": 8.0, "description": "Team meeting"}}]

            Here is the text content:
            {text_data[:20000]}
            """

            # Call Gemini
            logger.info("[UPLOAD] Sending to Gemini for timesheet analysis")
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content(prompt)

            response_text = response.text.strip()
            logger.info(f"[UPLOAD] AI response received, length={len(response_text)}")

            # Clean up response
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            # Parse JSON
            timesheets = json.loads(response_text)
            
            # Post-processing: If user has exactly one work code, set it automatically if empty
            if user_work_codes and len(user_work_codes) == 1:
                default_code = user_work_codes[0]
                for item in timesheets:
                    if not item.get("work_code"):
                        item["work_code"] = default_code
                        
            logger.info(f"[UPLOAD] Parsed {len(timesheets)} timesheets from AI response")
            return timesheets

        except json.JSONDecodeError as e:
            logger.error(f"[ERROR] UploadAPI.analyze_timesheets - JSON decode: {str(e)}")
            raise ValueError("Failed to parse timesheets using AI. The model response was not valid JSON.")
        except Exception as e:
            logger.error(f"[ERROR] UploadAPI.analyze_timesheets - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    async def confirm_timesheets(timesheets: list, user_id: str) -> Dict[str, Any]:
        """Accept reviewed timesheets and insert into database."""
        try:
            logger.info(f"[UPLOAD] Confirming {len(timesheets)} timesheets for user_id={user_id}")

            if not timesheets:
                return {"message": "No timesheets to import.", "count": 0}

            timesheets_to_insert = []
            now = datetime.now()

            for item in timesheets:
                try:
                    parsed_date = datetime.fromisoformat(item.date)
                except ValueError:
                    try:
                        parsed_date = datetime.strptime(item.date, "%Y-%m-%d")
                    except ValueError:
                        parsed_date = datetime.strptime(item.date, "%d-%m-%Y")

                timesheet = {
                    "user_id": ObjectId(user_id),
                    "work_code": item.work_code.strip() if getattr(item, "work_code", None) else "General",
                    "duration": float(item.duration),
                    "description": item.description.strip() if getattr(item, "description", None) else "",
                    "date": parsed_date,
                    "created_at": now,
                    "updated_at": now
                }
                timesheets_to_insert.append(timesheet)

            result = await db.timesheets.insert_many(timesheets_to_insert)
            logger.info(f"[UPLOAD] Imported {len(result.inserted_ids)} timesheets for user_id={user_id}")

            # Invalidate cache if there's any related to timesheets
            # (assuming user_id is the key for anything related)
            cache_service.invalidate_user_cache(user_id)

            return {
                "message": "Timesheets imported successfully!",
                "count": len(result.inserted_ids)
            }

        except Exception as e:
            logger.error(f"[ERROR] UploadAPI.confirm_timesheets - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))
