"""
Migration script to fix inconsistent transaction data in MongoDB.

Fixes:
1. user_id stored as string -> convert to ObjectId
2. date stored as string -> convert to datetime
3. Missing fields (payment_method, created_at, updated_at) -> add defaults
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from bson import ObjectId
from datetime import datetime

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "farm")


async def migrate():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print("Starting migration...")

    # Find all transactions where user_id is a string (not ObjectId)
    all_docs = await db.transactions.find({}).to_list(None)
    
    fixed_count = 0
    errors = []

    for doc in all_docs:
        updates = {}
        
        # Fix 1: user_id as string -> ObjectId
        if isinstance(doc.get("user_id"), str):
            try:
                updates["user_id"] = ObjectId(doc["user_id"])
            except Exception as e:
                errors.append(f"Cannot convert user_id '{doc['user_id']}': {e}")
                continue

        # Fix 2: date as string -> datetime
        if isinstance(doc.get("date"), str):
            date_str = doc["date"]
            try:
                # Try ISO format first
                parsed = datetime.fromisoformat(date_str)
                updates["date"] = parsed
            except ValueError:
                try:
                    parsed = datetime.strptime(date_str, "%Y-%m-%d")
                    updates["date"] = parsed
                except ValueError:
                    try:
                        parsed = datetime.strptime(date_str, "%d-%m-%Y")
                        updates["date"] = parsed
                    except ValueError:
                        errors.append(f"Cannot parse date '{date_str}' for doc {doc['_id']}")
                        continue

        # Fix 3: Missing fields
        if "payment_method" not in doc:
            updates["payment_method"] = "Other"
        if "created_at" not in doc:
            updates["created_at"] = doc.get("date") if isinstance(doc.get("date"), datetime) else datetime.now()
        if "updated_at" not in doc:
            updates["updated_at"] = datetime.now()

        if updates:
            # If we just converted the date, use the converted value for created_at
            if "date" in updates and "created_at" in updates:
                updates["created_at"] = updates["date"]
            
            await db.transactions.update_one(
                {"_id": doc["_id"]},
                {"$set": updates}
            )
            fixed_count += 1

    print(f"\nMigration complete:")
    print(f"  Total documents scanned: {len(all_docs)}")
    print(f"  Documents fixed: {fixed_count}")
    
    if errors:
        print(f"  Errors ({len(errors)}):")
        for e in errors:
            print(f"    - {e}")

    # Verify: check for any remaining string user_ids or string dates
    remaining_str_uid = 0
    remaining_str_date = 0
    all_docs_after = await db.transactions.find({}).to_list(None)
    for doc in all_docs_after:
        if isinstance(doc.get("user_id"), str):
            remaining_str_uid += 1
        if isinstance(doc.get("date"), str):
            remaining_str_date += 1
    
    print(f"\n  Remaining string user_ids: {remaining_str_uid}")
    print(f"  Remaining string dates: {remaining_str_date}")

    # Now verify KPI aggregation works for all users
    users = await db.transactions.distinct("user_id")
    print(f"\n  Distinct users after migration: {len(users)}")
    for uid in users:
        count = await db.transactions.count_documents({"user_id": uid})
        print(f"    user_id={uid} (type={type(uid).__name__}) -> {count} transactions")

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(migrate())
