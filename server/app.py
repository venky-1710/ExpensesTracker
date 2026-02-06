from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database.database import client, MONGODB_URI
from routes.routes import router
from routes.auth_routes import auth_router
from contextlib import asynccontextmanager
import os

load_dotenv()  # loads variables from .env file
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await client.admin.command("ping")
        print(f"✅ Database Connected {MONGODB_URI}")
    except Exception as e:
        print("❌ MongoDB connection error:", e)
    yield

    client.close()

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL"),"http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Server Running Successfull"}


