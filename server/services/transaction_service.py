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
    get_all_transactions_query,
    get_filtered_totals_query,
    get_total_balance_query
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
        
        # Calculate filtered totals
        filtered_totals = await get_filtered_totals_query(query)
        
        # Calculate available balance (all time)
        available_balance = await get_total_balance_query(user_id)
        
        return {
            "transactions": formatted_transactions,
            "total": total,
            "page": pagination.page,
            "limit": pagination.limit,
            "total_pages": total_pages,
            "total_credits": filtered_totals["credit"],
            "total_debits": filtered_totals["debit"],
            "available_balance": available_balance
        }
    
    @staticmethod
    async def export_transactions(user_id: str, filters: TransactionFilter, format: str = "csv", user: Dict[str, Any] = None) -> Any:
        """Export transactions to specified format"""
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
        
        if format == "csv":
            return TransactionService._export_to_csv(transactions)
        elif format == "pdf":
            return TransactionService._export_to_pdf(transactions, filters, user)
        elif format == "xlsx":
            return TransactionService._export_to_excel(transactions)
        else:
            raise HTTPException(status_code=400, detail="Invalid format")

    @staticmethod
    def _export_to_csv(transactions: List[Dict]) -> str:
        """Generate CSV string"""
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

    @staticmethod
    def _export_to_pdf(transactions: List[Dict], filters: TransactionFilter, user: Dict[str, Any] = None) -> bytes:
        """Generate PDF with Professional Design (No charts, clear user details)"""
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
        from reportlab.lib.units import inch
        from reportlab.graphics.shapes import Drawing, Rect, String
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4,
            rightMargin=30, leftMargin=30, 
            topMargin=30, bottomMargin=30
        )
        elements = []
        styles = getSampleStyleSheet()
        
        # Colors
        theme_purple = colors.HexColor('#483D8B') # DarkSlateBlue
        text_color = colors.HexColor('#374151')
        
        # Styles
        styles.add(ParagraphStyle(name='SectionTitle', fontSize=14, textColor=theme_purple, fontName='Helvetica-Bold', spaceBefore=15, spaceAfter=10))

        # --- 1. Header (Drawing) ---
        # Increased height to accommodate user details cleanly
        header_height = 100
        header_drawing = Drawing(A4[0] - 60, header_height)
        
        # Purple Background
        rect = Rect(0, 0, A4[0] - 60, header_height)
        rect.fillColor = theme_purple
        rect.strokeColor = theme_purple
        header_drawing.add(rect)
        
        # Title
        title = String(20, 65, "PERSONAL")
        title.fontName = 'Helvetica-Bold'
        title.fontSize = 20
        title.fillColor = colors.white
        header_drawing.add(title)
        
        title2 = String(20, 40, "EXPENSES TRACKER")
        title2.fontName = 'Helvetica-Bold'
        title2.fontSize = 20
        title2.fillColor = colors.white
        header_drawing.add(title2)
        
        # User Details (Right Aligned in Header)
        if user:
            # Name
            name_text = String(A4[0] - 80, 70, user.get('full_name', 'User').upper())
            name_text.fontName = 'Helvetica-Bold'
            name_text.fontSize = 14
            name_text.fillColor = colors.white
            name_text.textAnchor = 'end'
            header_drawing.add(name_text)
            
            # Email
            email_text = String(A4[0] - 80, 50, user.get('email', ''))
            email_text.fontName = 'Helvetica'
            email_text.fontSize = 10
            email_text.fillColor = colors.white  # Slightly transparent look is hard in modest PDF, stick to white
            email_text.textAnchor = 'end'
            header_drawing.add(email_text)
            
            # Report Date
            date_str = datetime.now().strftime('%B %d, %Y')
            date_text = String(A4[0] - 80, 25, f"Report Date: {date_str}")
            date_text.fontName = 'Helvetica-Oblique'
            date_text.fontSize = 9
            date_text.fillColor = colors.lightgrey
            date_text.textAnchor = 'end'
            header_drawing.add(date_text)

        elements.append(header_drawing)
        elements.append(Spacer(1, 25))

        # --- 2. Expenses Table ---
        elements.append(Paragraph("TRANSACTION HISTORY", styles['SectionTitle']))
        
        table_data = [[
            "DESCRIPTION",
            "CATEGORY", 
            "DATE",
            "AMOUNT"
        ]]
        
        row_colors = []
        total_credit = 0
        total_debit = 0
        
        for i, t in enumerate(transactions):
            row_colors.append(colors.white if i % 2 == 0 else colors.whitesmoke)
            
            amt = t['amount']
            if t['type'] == 'credit':
                total_credit += amt
                amt_str = f"+{amt:,.2f}"
                amt_color = colors.green
            else:
                total_debit += amt
                amt_str = f"-{amt:,.2f}"
                amt_color = colors.red
            
            table_data.append([
                Paragraph(t.get("description", "")[:40], styles['Normal']),
                t['category'],
                t["date"].strftime("%b %d, %Y"),
                Paragraph(amt_str, ParagraphStyle('Amt', parent=styles['Normal'], alignment=TA_RIGHT, textColor=amt_color))
            ])

        t_style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), theme_purple),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('TOPPADDING', (0,0), (-1,0), 12),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (3,0), (3,-1), 'RIGHT'), # Amount column
            ('GRID', (0,0), (-1,-1), 0, colors.white),
        ])
        
        for i, color in enumerate(row_colors):
            t_style.add('BACKGROUND', (0, i+1), (-1, i+1), color)

        trans_table = Table(table_data, colWidths=[3*inch, 1.5*inch, 1.2*inch, 1.2*inch], repeatRows=1)
        trans_table.setStyle(t_style)
        elements.append(trans_table)
        elements.append(Spacer(1, 30))
        
        # --- 3. Financial Summary (Professional Table) ---
        elements.append(Paragraph("FINANCIAL SUMMARY", styles['SectionTitle']))
        
        net_balance = total_credit - total_debit
        
        summary_data = [
            ['Total Income', f"+{total_credit:,.2f}"],
            ['Total Expense', f"-{total_debit:,.2f}"],
            ['Net Balance', f"{net_balance:,.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('TEXTCOLOR', (1,0), (1,0), colors.green), # Income
            ('TEXTCOLOR', (1,1), (1,1), colors.red),   # Expense
            ('TEXTCOLOR', (1,2), (1,2), theme_purple), # Net
            ('FONTNAME', (0,2), (-1,2), 'Helvetica-Bold'), # Net Row Bold
            ('LINEABOVE', (0,2), (-1,2), 1, colors.lightgrey),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))
        
        elements.append(summary_table)

        # Build
        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.grey)
            page_num = canvas.getPageNumber()
            canvas.drawString(30, 20, "Generated by Expense Tracker")
            canvas.drawRightString(A4[0] - 30, 20, f"Page {page_num}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def _export_to_excel(transactions: List[Dict]) -> bytes:
        """Generate Excel bytes"""
        import pandas as pd
        
        # Prepare data for DataFrame
        data = []
        for t in transactions:
            data.append({
                "Date": t["date"],
                "Type": t["type"],
                "Category": t["category"],
                "Amount": t["amount"],
                "Payment Method": t["payment_method"],
                "Description": t.get("description", "")
            })
            
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Transactions')
            
        output.seek(0)
        return output.getvalue()
