"""
Shared helper functions and decorators for the API layer.
"""
from functools import wraps
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from utils.logger import logger
import traceback
import time
import os


def api_handler(func: Callable) -> Callable:
    """
    Decorator for route handlers that provides:
    - Request logging with timing
    - Standardized error handling
    - HTTPException passthrough
    - Full traceback logging for unexpected errors
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        func_name = func.__name__
        start_time = time.time()

        logger.info(f"[REQUEST] {func_name} - started")

        try:
            result = await func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.info(f"[OK] {func_name} - completed in {elapsed:.2f}s")
            return result

        except HTTPException:
            elapsed = time.time() - start_time
            logger.warning(f"[HTTP_ERROR] {func_name} - raised HTTPException after {elapsed:.2f}s")
            raise

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[ERROR] {func_name} - {str(e)} ({elapsed:.2f}s)")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e) if os.getenv("DEBUG") == "true" else "An unexpected error occurred"
            )

    return wrapper


def format_user_doc(user: Dict[str, Any], strip_password: bool = True) -> Dict[str, Any]:
    """
    Format a MongoDB user document for API response.
    - Converts _id (ObjectId) to id (str)
    - Optionally strips password_hash
    """
    if user is None:
        return None
    if "_id" in user:
        user["id"] = str(user.pop("_id"))
    if strip_password:
        user.pop("password_hash", None)
    return user


def format_transaction_doc(txn: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a MongoDB transaction document for API response.
    - Converts _id (ObjectId) to id (str)
    - Converts user_id (ObjectId) to str
    """
    if txn is None:
        return None
    if "_id" in txn:
        txn["id"] = str(txn.pop("_id"))
    if "user_id" in txn and isinstance(txn["user_id"], ObjectId):
        txn["user_id"] = str(txn["user_id"])
    return txn


def build_date_query(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Optional[Dict]:
    """
    Build a MongoDB date range query filter.
    Returns None if no dates provided.
    """
    if not start_date and not end_date:
        return None
    date_query = {}
    if start_date:
        date_query["$gte"] = start_date
    if end_date:
        date_query["$lte"] = end_date
    return date_query
