from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from database.database import client, MONGODB_URI
from routes.auth_routes import auth_router
from routes.user_routes import user_router
from routes.transaction_routes import transaction_router
from routes.dashboard_routes import dashboard_router
from contextlib import asynccontextmanager
import os
import time
import traceback

load_dotenv()  # loads variables from .env file

# Import logger AFTER load_dotenv
from utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("🚀 Starting Expense Tracker API...")
        await client.admin.command("ping")
        logger.info(f"✅ Database Connected: {MONGODB_URI}")
        
        # Create indexes on startup
        logger.info("📊 Creating MongoDB indexes...")
        from scripts.create_indexes import create_indexes
        await create_indexes()
        logger.info("✅ Indexes created successfully")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {str(e)}")
        logger.error(traceback.format_exc())
    
    yield
    
    logger.info("👋 Shutting down...")
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
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"📨 {request.method} {request.url.path}")
    logger.debug(f"Headers: {dict(request.headers)}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response
        logger.info(f"✅ {request.method} {request.url.path} - {response.status_code} ({process_time:.2f}s)")
        
        # Add process time header
        response.headers["X-Process-Time"] = str(process_time)
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"❌ {request.method} {request.url.path} - Error: {str(e)} ({process_time:.2f}s)")
        logger.error(traceback.format_exc())
        raise


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unhandled exception on {request.method} {request.url.path}")
    logger.error(f"Exception: {str(exc)}")
    logger.error(traceback.format_exc())
    
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
    logger.warning(f"⚠️ Validation error on {request.method} {request.url.path}")
    logger.warning(f"Errors: {exc.errors()}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "detail": exc.errors()
        }
    )


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("CLIENT_URL", "http://localhost:5173"), 
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"]
)

# Register routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(transaction_router)
app.include_router(dashboard_router)


@app.get("/")
async def root():
    return {
        "message": "Expense Tracker API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        await client.admin.command("ping")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )


