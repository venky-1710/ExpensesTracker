"""
Transaction database queries
"""
from database.database import db
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any, Optional

async def create_transaction_query(transaction_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new transaction"""
    result = await db.transactions.insert_one(transaction_data)
    transaction_data["id"] = str(result.inserted_id)
    transaction_data.pop("_id", None)
    return transaction_data

async def get_transaction_by_id_query(user_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
    """Get a transaction by ID and User ID"""
    return await db.transactions.find_one({
        "_id": ObjectId(transaction_id),
        "user_id": ObjectId(user_id)
    })

async def update_transaction_query(user_id: str, transaction_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a transaction"""
    result = await db.transactions.update_one(
        {
            "_id": ObjectId(transaction_id),
            "user_id": ObjectId(user_id)
        },
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return None
        
    return await get_transaction_by_id_query(user_id, transaction_id)

async def delete_transaction_query(user_id: str, transaction_id: str) -> bool:
    """Delete a transaction"""
    result = await db.transactions.delete_one({
        "_id": ObjectId(transaction_id),
        "user_id": ObjectId(user_id)
    })
    return result.deleted_count > 0

async def list_transactions_query(query: Dict[str, Any], skip: int, limit: int, sort: List[Any]) -> List[Dict[str, Any]]:
    """List transactions with pagination and sorting"""
    cursor = db.transactions.find(query).sort(sort).skip(skip).limit(limit)
    return await cursor.to_list(length=limit)

async def count_transactions_query(query: Dict[str, Any]) -> int:
    """Count transactions matching query"""
    return await db.transactions.count_documents(query)

async def get_all_transactions_query(query: Dict[str, Any], sort_field: str = "date", sort_order: int = -1) -> List[Dict[str, Any]]:
    """Get all transactions for export (no pagination)"""
    cursor = db.transactions.find(query).sort(sort_field, sort_order)
    return await cursor.to_list(length=None)
