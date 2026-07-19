"""
MongoDB index creation script
Run this to create all necessary indexes for optimal query performance
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "farm")


async def create_indexes():
    """Create all MongoDB indexes"""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print("Creating indexes...")

    # Users collection indexes
    await db["auth_users"].create_index("email", unique=True)
    # TODO: Uncomment after migrating existing users
    # await db["auth_users"].create_index("username", unique=True)
    await db["auth_users"].create_index("is_deleted")
    await db["auth_users"].create_index([("email", 1), ("is_deleted", 1)])
    print("[OK] Users indexes created")

    
    # Transactions collection indexes
    print("  - transactions indexes...")
    await db.transactions.create_index([("user_id", 1), ("date", -1)])
    await db.transactions.create_index("category")
    await db.transactions.create_index("type")
    await db.transactions.create_index([("user_id", 1), ("category", 1)])
    await db.transactions.create_index([("user_id", 1), ("type", 1)])
    
    # Budgets collection indexes
    print("  - budgets indexes...")
    await db.budgets.create_index([("user_id", 1), ("year", 1), ("month", 1), ("category", 1)], unique=True)
    await db.budgets.create_index([("user_id", 1), ("is_active", 1)])
    
    # Widget mappings collection indexes
    print("  - widget_mappings indexes...")
    await db.widget_mappings.create_index("widget_name", unique=True)
    await db.widget_mappings.create_index([("is_active", 1), ("order", 1)])
    
    # Chat History collection indexes
    print("  - chat_history indexes...")
    await db.chat_history.create_index("user_id")
    # TTL Index: Automatically purge documents 30 days (2592000 seconds) after 'created_at'
    await db.chat_history.create_index("created_at", expireAfterSeconds=2592000)

    # Notifications collection indexes
    print("  - notifications indexes...")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("is_read", 1)])

    # Timesheets collection indexes
    print("  - timesheets indexes...")
    # Unique index to enforce 1 timesheet per user per day
    await db.timesheets.create_index([("user_id", 1), ("date", 1)], unique=True)
    await db.timesheets.create_index([("user_id", 1), ("date", -1)])

    print("[OK] All indexes created successfully!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_indexes())
