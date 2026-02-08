"""
Transaction service - Business logic for transaction operations
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from models.payloads import (
    TransactionCreate, 
    TransactionUpdate, 
    TransactionResponse,
    TransactionFilter,
    PaginationParams,
    TransactionListResponse
)
from database.queries.transaction_queries import (
    create_transaction_query, 
    get_transaction_by_id_query, 
    update_transaction_query, 
    delete_transaction_query,
    list_transactions_query,
    count_transactions_query,
    get_all_transactions_query
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
        try:
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
            
            result = await create_transaction_query(doc)
            result["user_id"] = str(result["user_id"])
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    async def get_transaction(user_id: str, transaction_id: str) -> Dict[str, Any]:
        """Get single transaction by ID"""
        transaction = await get_transaction_by_id_query(user_id, transaction_id)
        
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
        
        updated_transaction = await update_transaction_query(user_id, transaction_id, update_dict)
        
        if not updated_transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
            
        updated_transaction["id"] = str(updated_transaction.pop("_id"))
        updated_transaction["user_id"] = str(updated_transaction["user_id"])
        return updated_transaction
    
    @staticmethod
    async def delete_transaction(user_id: str, transaction_id: str):
        """Delete transaction"""
        success = await delete_transaction_query(user_id, transaction_id)
        
        if not success:
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
        total = await count_transactions_query(query)
        
        # Calculate pagination
        skip = (pagination.page - 1) * pagination.limit
        total_pages = math.ceil(total / pagination.limit)
        
        # Build sort
        sort_order = -1 if pagination.sort_order == "desc" else 1
        sort = [(pagination.sort_by, sort_order)]
        
        # Fetch transactions
        transactions = await list_transactions_query(query, skip, pagination.limit, sort)
        
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
        transactions = await get_all_transactions_query(query)
        
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
