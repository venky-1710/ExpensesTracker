"""
Transaction API - Transaction management business logic and database queries.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status
from database.database import db
from utils.helpers import format_transaction_doc, build_date_query
from utils.logger import logger
from models.payloads import (
    TransactionCreate,
    TransactionUpdate,
    TransactionFilter,
    PaginationParams,
)
from typing import List, Dict, Any
from apis.user_api import UserAPI
import traceback
import csv
import io
import math


class TransactionAPI:
    """Transaction business logic with inline MongoDB queries."""

    @staticmethod
    async def create_transaction(user_id: str, transaction_data: TransactionCreate) -> Dict[str, Any]:
        """Create a new transaction."""
        try:
            logger.info(f"[TRANSACTION] Creating transaction for user_id: {user_id}")

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
            
            # Silently add to custom tags if they are new
            await UserAPI.add_custom_tags(user_id, transaction_data.category, transaction_data.payment_method)

            result = await db.transactions.insert_one(doc)
            doc["id"] = str(result.inserted_id)
            doc.pop("_id", None)
            doc["user_id"] = str(doc["user_id"])

            logger.info(f"[TRANSACTION] Created transaction id={doc['id']} for user_id: {user_id}")
            return doc

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.create_transaction - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def get_transaction(user_id: str, transaction_id: str) -> Dict[str, Any]:
        """Get a single transaction by ID."""
        try:
            logger.info(f"[TRANSACTION] Getting transaction_id={transaction_id} for user_id={user_id}")

            transaction = await db.transactions.find_one({
                "_id": ObjectId(transaction_id),
                "user_id": ObjectId(user_id)
            })

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Transaction not found"
                )

            return format_transaction_doc(transaction)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.get_transaction - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def update_transaction(
        user_id: str,
        transaction_id: str,
        update_data: TransactionUpdate
    ) -> Dict[str, Any]:
        """Update a transaction."""
        try:
            logger.info(f"[TRANSACTION] Updating transaction_id={transaction_id} for user_id={user_id}")

            update_dict = update_data.model_dump(exclude_unset=True)

            if not update_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )

            update_dict["updated_at"] = datetime.now()

            # Silently add to custom tags if they are new
            await UserAPI.add_custom_tags(
                user_id, 
                update_dict.get("category"), 
                update_dict.get("payment_method")
            )

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

            updated = await db.transactions.find_one({
                "_id": ObjectId(transaction_id),
                "user_id": ObjectId(user_id)
            })

            logger.info(f"[TRANSACTION] Updated transaction_id={transaction_id}")
            return format_transaction_doc(updated)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.update_transaction - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def delete_transaction(user_id: str, transaction_id: str) -> Dict[str, str]:
        """Delete a transaction."""
        try:
            logger.info(f"[TRANSACTION] Deleting transaction_id={transaction_id} for user_id={user_id}")

            result = await db.transactions.delete_one({
                "_id": ObjectId(transaction_id),
                "user_id": ObjectId(user_id)
            })

            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Transaction not found"
                )

            logger.info(f"[TRANSACTION] Deleted transaction_id={transaction_id}")
            return {"message": "Transaction deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.delete_transaction - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def list_transactions(
        user_id: str,
        filters: TransactionFilter,
        pagination: PaginationParams
    ) -> Dict[str, Any]:
        """List transactions with filters and pagination."""
        try:
            logger.info(f"[TRANSACTION] Listing transactions for user_id={user_id}")

            # Build query
            query = {"user_id": ObjectId(user_id)}

            if filters.type:
                query["type"] = filters.type
            if filters.category:
                query["category"] = filters.category
            if filters.payment_method:
                query["payment_method"] = filters.payment_method

            date_query = build_date_query(filters.start_date, filters.end_date)
            if date_query:
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
            formatted_transactions = [format_transaction_doc(t) for t in transactions]

            # Calculate filtered totals
            filtered_totals = await TransactionAPI._get_filtered_totals(query)

            # Calculate available balance (all time)
            available_balance = await TransactionAPI._get_total_balance(user_id)

            logger.info(f"[TRANSACTION] Listed {len(formatted_transactions)} transactions for user_id={user_id}")
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

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.list_transactions - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def _get_filtered_totals(query: Dict[str, Any]) -> Dict[str, float]:
        """Calculate total credits and debits for filtered transactions."""
        try:
            pipeline = [
                {"$match": query},
                {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
            ]
            result = await db.transactions.aggregate(pipeline).to_list(length=None)

            totals = {"credit": 0.0, "debit": 0.0}
            for item in result:
                key = str(item["_id"]).lower()
                if key in totals:
                    totals[key] = item["total"]
            return totals

        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI._get_filtered_totals - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return {"credit": 0.0, "debit": 0.0}

    @staticmethod
    async def _get_total_balance(user_id: str) -> float:
        """Calculate total available balance (all time)."""
        try:
            pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
            ]
            result = await db.transactions.aggregate(pipeline).to_list(length=None)

            credits = 0.0
            debits = 0.0
            for item in result:
                key = str(item["_id"]).lower()
                if key == "credit":
                    credits = item["total"]
                elif key == "debit":
                    debits = item["total"]

            return round(credits - debits, 2)

        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI._get_total_balance - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            return 0.0

    @staticmethod
    async def export_transactions(
        user_id: str,
        filters: TransactionFilter,
        format: str = "csv",
        user: Dict[str, Any] = None
    ) -> Any:
        """Export transactions to specified format."""
        try:
            logger.info(f"[TRANSACTION] Exporting transactions for user_id={user_id}, format={format}")

            # Build query
            query = {"user_id": ObjectId(user_id)}

            if filters.type:
                query["type"] = filters.type
            if filters.category:
                query["category"] = filters.category
            if filters.payment_method:
                query["payment_method"] = filters.payment_method

            date_query = build_date_query(filters.start_date, filters.end_date)
            if date_query:
                query["date"] = date_query

            # Fetch all matching transactions (no pagination)
            cursor = db.transactions.find(query).sort("date", -1)
            transactions = await cursor.to_list(length=None)

            logger.info(f"[TRANSACTION] Exporting {len(transactions)} transactions")

            if format == "csv":
                return TransactionAPI._export_to_csv(transactions)
            elif format == "pdf":
                return TransactionAPI._export_to_pdf(transactions, filters, user)
            elif format == "xlsx":
                return TransactionAPI._export_to_excel(transactions)
            else:
                raise HTTPException(status_code=400, detail="Invalid format")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI.export_transactions - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def _export_to_csv(transactions: List[Dict]) -> str:
        """Generate CSV string."""
        try:
            output = io.StringIO()
            writer = csv.writer(output)

            writer.writerow([
                "Date", "Type", "Category", "Amount",
                "Payment Method", "Description"
            ])

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

        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI._export_to_csv - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    def _export_to_pdf(transactions: List[Dict], filters: TransactionFilter, user: Dict[str, Any] = None) -> bytes:
        """Generate PDF with Professional Design."""
        try:
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
            theme_purple = colors.HexColor('#483D8B')
            text_color = colors.HexColor('#374151')

            # Styles
            styles.add(ParagraphStyle(name='SectionTitle', fontSize=14, textColor=theme_purple, fontName='Helvetica-Bold', spaceBefore=15, spaceAfter=10))

            # --- 1. Header ---
            header_height = 100
            header_drawing = Drawing(A4[0] - 60, header_height)

            rect = Rect(0, 0, A4[0] - 60, header_height)
            rect.fillColor = theme_purple
            rect.strokeColor = theme_purple
            header_drawing.add(rect)

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

            if user:
                name_text = String(A4[0] - 80, 70, user.get('full_name', 'User').upper())
                name_text.fontName = 'Helvetica-Bold'
                name_text.fontSize = 14
                name_text.fillColor = colors.white
                name_text.textAnchor = 'end'
                header_drawing.add(name_text)

                email_text = String(A4[0] - 80, 50, user.get('email', ''))
                email_text.fontName = 'Helvetica'
                email_text.fontSize = 10
                email_text.fillColor = colors.white
                email_text.textAnchor = 'end'
                header_drawing.add(email_text)

                date_str = datetime.now().strftime('%B %d, %Y')
                date_text = String(A4[0] - 80, 25, f"Report Date: {date_str}")
                date_text.fontName = 'Helvetica-Oblique'
                date_text.fontSize = 9
                date_text.fillColor = colors.lightgrey
                date_text.textAnchor = 'end'
                header_drawing.add(date_text)

            elements.append(header_drawing)
            elements.append(Spacer(1, 25))

            # --- 2. Transaction Table ---
            elements.append(Paragraph("TRANSACTION HISTORY", styles['SectionTitle']))

            table_data = [["DESCRIPTION", "CATEGORY", "DATE", "AMOUNT"]]

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
                ('BACKGROUND', (0, 0), (-1, 0), theme_purple),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0, colors.white),
            ])

            for i, color in enumerate(row_colors):
                t_style.add('BACKGROUND', (0, i + 1), (-1, i + 1), color)

            trans_table = Table(table_data, colWidths=[3 * inch, 1.5 * inch, 1.2 * inch, 1.2 * inch], repeatRows=1)
            trans_table.setStyle(t_style)
            elements.append(trans_table)
            elements.append(Spacer(1, 30))

            # --- 3. Financial Summary ---
            elements.append(Paragraph("FINANCIAL SUMMARY", styles['SectionTitle']))

            net_balance = total_credit - total_debit
            summary_data = [
                ['Total Income', f"+{total_credit:,.2f}"],
                ['Total Expense', f"-{total_debit:,.2f}"],
                ['Net Balance', f"{net_balance:,.2f}"]
            ]

            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch], hAlign='LEFT')
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('TEXTCOLOR', (1, 0), (1, 0), colors.green),
                ('TEXTCOLOR', (1, 1), (1, 1), colors.red),
                ('TEXTCOLOR', (1, 2), (1, 2), theme_purple),
                ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
                ('LINEABOVE', (0, 2), (-1, 2), 1, colors.lightgrey),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))

            elements.append(summary_table)

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

        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI._export_to_pdf - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise

    @staticmethod
    def _export_to_excel(transactions: List[Dict]) -> bytes:
        """Generate Excel bytes."""
        try:
            import pandas as pd

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

        except Exception as e:
            logger.error(f"[ERROR] TransactionAPI._export_to_excel - {str(e)}")
            logger.error(f"[TRACEBACK] {traceback.format_exc()}")
            raise
