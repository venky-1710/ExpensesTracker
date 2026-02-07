"""
Transaction service - Business logic for transaction operations
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from database.database import db
from models.transaction_model import (
    TransactionCreate, 
    TransactionUpdate, 
    TransactionFilter, 
    PaginationParams,
    TransactionResponse
)
from typing import List, Dict, Any
import csv
import io
import math


class TransactionService:
    """Transaction-related business operations"""
    
    @staticmethod
    async def create_transaction(user_id: str, transaction_data: TransactionCreate) -> Dict[str, Any]:
        """Create a new transaction"""
        doc = {
            "user_id": ObjectId(user_id),
            "amount": transaction_data.amount,
            "type": transaction_data.type,
            "category": transaction_data.category,
            "description": transaction_data.description,
            "payment_method": transaction_data.payment_method,
            "date": transaction_data.date,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = await db.transactions.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc["user_id"] = user_id
        doc.pop("_id", None)
        
        return doc
    
    @staticmethod
    async def get_transaction(user_id: str, transaction_id: str) -> Dict[str, Any]:
        """Get single transaction by ID"""
        transaction = await db.transactions.find_one({
            "_id": ObjectId(transaction_id),
            "user_id": ObjectId(user_id)
        })
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        transaction["id"] = str(transaction.pop("_id"))
        transaction["user_id"] = str(transaction["user_id"])
        return transaction
    
    @staticmethod
    async def update_transaction(
        user_id: str, 
        transaction_id: str, 
        update_data: TransactionUpdate
    ) -> Dict[str, Any]:
        """Update transaction"""
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_dict["updated_at"] = datetime.now()
        
        result = await db.transactions.update_one(
            {
                "_id": ObjectId(transaction_id),
                "user_id": ObjectId(user_id)
            },
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return await TransactionService.get_transaction(user_id, transaction_id)
    
    @staticmethod
    async def delete_transaction(user_id: str, transaction_id: str):
        """Delete transaction"""
        result = await db.transactions.delete_one({
            "_id": ObjectId(transaction_id),
            "user_id": ObjectId(user_id)
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return {"message": "Transaction deleted successfully"}
    
    @staticmethod
    async def list_transactions(
        user_id: str,
        filters: TransactionFilter,
        pagination: PaginationParams
    ) -> Dict[str, Any]:
        """List transactions with filters and pagination"""
        # Build query
        query = {"user_id": ObjectId(user_id)}
        
        if filters.type:
            query["type"] = filters.type
        
        if filters.category:
            query["category"] = filters.category
        
        if filters.payment_method:
            query["payment_method"] = filters.payment_method
        
        if filters.start_date or filters.end_date:
            date_query = {}
            if filters.start_date:
                date_query["$gte"] = filters.start_date
            if filters.end_date:
                date_query["$lte"] = filters.end_date
            query["date"] = date_query
        
        if filters.search:
            query["description"] = {"$regex": filters.search, "$options": "i"}
        
        # Get total count
        total = await db.transactions.count_documents(query)
        
        # Calculate pagination
        skip = (pagination.page - 1) * pagination.limit
        total_pages = math.ceil(total / pagination.limit)
        
        # Build sort
        sort_order = -1 if pagination.sort_order == "desc" else 1
        sort = [(pagination.sort_by, sort_order)]
        
        # Fetch transactions
        cursor = db.transactions.find(query).sort(sort).skip(skip).limit(pagination.limit)
        transactions = await cursor.to_list(length=pagination.limit)
        
        # Format response
        formatted_transactions = []
        for t in transactions:
            t["id"] = str(t.pop("_id"))
            t["user_id"] = str(t["user_id"])
            formatted_transactions.append(t)
        
        return {
            "transactions": formatted_transactions,
            "total": total,
            "page": pagination.page,
            "limit": pagination.limit,
            "total_pages": total_pages
        }
    
    @staticmethod
    async def export_to_csv(user_id: str, filters: TransactionFilter) -> str:
        """Export transactions to CSV"""
        # Build query (similar to list_transactions but no pagination)
        query = {"user_id": ObjectId(user_id)}
        
        if filters.type:
            query["type"] = filters.type
        if filters.category:
            query["category"] = filters.category
        if filters.payment_method:
            query["payment_method"] = filters.payment_method
        if filters.start_date or filters.end_date:
            date_query = {}
            if filters.start_date:
                date_query["$gte"] = filters.start_date
            if filters.end_date:
                date_query["$lte"] = filters.end_date
            query["date"] = date_query
        
        # Fetch all matching transactions
        cursor = db.transactions.find(query).sort("date", -1)
        transactions = await cursor.to_list(length=None)
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Date", "Type", "Category", "Amount", 
            "Payment Method", "Description"
        ])
        
        # Data
        for t in transactions:
            writer.writerow([
                t["date"].strftime("%Y-%m-%d %H:%M:%S"),
                t["type"],
                t["category"],
                f"{t['amount']:.2f}",
                t["payment_method"],
                t.get("description", "")
            ])
        
        return output.getvalue()
