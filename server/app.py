"""
Expense Tracker API - Main Application Entry Point
"""
from dotenv import load_dotenv
load_dotenv()  # Must run before any module that reads os.getenv at import time

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from database.database import client, MONGODB_URI
from routes.auth_routes import auth_router
from routes.user_routes import user_router
from routes.transaction_routes import transaction_router
from routes.dashboard_routes import dashboard_router
from routes.chat_routes import router as chat_router
from routes.cache_routes import router as cache_router
from routes.upload_routes import upload_router
from routes.calendar_routes import router as calendar_router
from routes.notification_routes import router as notification_router
from routes.support_routes import router as support_router
from contextlib import asynccontextmanager
import os
import time
import traceback

# Import logger AFTER load_dotenv
from utils.logger import logger
import asyncio
from utils.scheduler import scheduler_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    try:
        logger.info("[START] Starting Expense Tracker API...")

        # Check API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            logger.info("[CONFIG] GEMINI_API_KEY found in environment")
        else:
            logger.warning("[CONFIG] GEMINI_API_KEY NOT found in environment")

        await client.admin.command("ping")
        logger.info(f"[DB] Database connected: {MONGODB_URI[:30]}...")

        # Create indexes on startup
        logger.info("[DB] Creating MongoDB indexes...")
        from scripts.create_indexes import create_indexes
        await create_indexes()
        logger.info("[DB] Indexes created successfully")

        # Start notification scheduler
        asyncio.create_task(scheduler_loop())

    except Exception as e:
        logger.error(f"[ERROR] Startup error: {str(e)}")
        logger.error(f"[TRACEBACK] {traceback.format_exc()}")

    yield

    logger.info("[SHUTDOWN] Shutting down...")
    client.close()


app = FastAPI(
    title="Expense Tracker API",
    description="Production-ready expense tracking API with analytics",
    version="1.0.0",
    lifespan=lifespan
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()

    logger.info(f"[REQUEST] {request.method} {request.url.path}")
    logger.debug(f"[HEADERS] {dict(request.headers)}")

    try:
        response = await call_next(request)
        process_time = time.time() - start_time

        logger.info(f"[RESPONSE] {request.method} {request.url.path} - {response.status_code} ({process_time:.2f}s)")

        response.headers["X-Process-Time"] = str(process_time)
        return response

    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"[ERROR] {request.method} {request.url.path} - {str(e)} ({process_time:.2f}s)")
        logger.error(f"[TRACEBACK] {traceback.format_exc()}")
        raise


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"[UNHANDLED] {request.method} {request.url.path}")
    logger.error(f"[EXCEPTION] {str(exc)}")
    logger.error(f"[TRACEBACK] {traceback.format_exc()}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else "An unexpected error occurred"
        }
    )


# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(f"[VALIDATION] {request.method} {request.url.path}")
    logger.warning(f"[ERRORS] {exc.errors()}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "detail": exc.errors()
        }
    )


# CORS middleware - Production ready
allowed_origins = os.getenv("CLIENT_URL", "http://localhost:5173").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]

# Always include common dev origins
if "http://localhost:5173" not in allowed_origins:
    allowed_origins.append("http://localhost:5173")
if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")
if "http://localhost:8081" not in allowed_origins:
    allowed_origins.append("http://localhost:8081")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+|http://10\.0\.2\.2:\d+|http://192\.168\..*:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"]
)


# Register routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(transaction_router, prefix="/transactions", tags=["transactions"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(cache_router, prefix="/api/cache", tags=["cache"])
app.include_router(upload_router, prefix="/api/upload", tags=["upload"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["calendar"])
app.include_router(notification_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(support_router, prefix="/api/support", tags=["support"])


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API docs."""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        await client.admin.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"[HEALTH] Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )
