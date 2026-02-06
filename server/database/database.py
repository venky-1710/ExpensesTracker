# database.py
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()  # load .env vars

MONGODB_URI = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "farm")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
