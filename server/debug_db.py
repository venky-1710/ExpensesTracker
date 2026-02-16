"""Quick debug script to check transactions in DB"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "expenses_tracker")

async def debug():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # 1. Show last 20 transactions with types
    print("=" * 60)
    print(f"DB: {DB_NAME}")
    print("LAST 20 TRANSACTIONS")
    print("=" * 60)
    
    all_txns = await db.transactions.find().sort("_id", -1).to_list(length=20)
    
    if not all_txns:
        print("NO TRANSACTIONS FOUND IN DB!")
    else:
        for t in all_txns:
            uid = t.get("user_id")
            date = t.get("date")
            print(f"  _id={t['_id']} | user_id={uid} (type={type(uid).__name__}) | date={date} (type={type(date).__name__}) | amt={t.get('amount')} | cat={t.get('category')} | pay={t.get('payment_method','N/A')}")
    
    # 2. Show all users
    print("\n" + "=" * 60)
    print("ALL USERS")
    print("=" * 60)
    users = await db.auth_users.find().to_list(length=10)
    for u in users:
        print(f"  _id={u['_id']} (type={type(u['_id']).__name__}) | email={u.get('email')}")
    
    # 3. Count by user_id type
    print("\n" + "=" * 60)
    print("TRANSACTION COUNT")
    print("=" * 60)
    total = await db.transactions.count_documents({})
    print(f"  Total transactions: {total}")
    
    # Check if any have string user_ids
    if all_txns:
        string_ids = [t for t in all_txns if isinstance(t.get("user_id"), str)]
        oid_ids = [t for t in all_txns if isinstance(t.get("user_id"), ObjectId)]
        print(f"  String user_ids: {len(string_ids)}")
        print(f"  ObjectId user_ids: {len(oid_ids)}")
    
    client.close()

asyncio.run(debug())
