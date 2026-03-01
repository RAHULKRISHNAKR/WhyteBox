"""
WhyteBox API - Main Application

A modern neural network visualization and explainability platform.
"""

import logging
import time
from contextlib import asynccontextmanager

from app.api.v1 import api_router
from app.core.cache import cache_manager
from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import setup_logging
from app.core.monitoring import metrics_collector, performance_monitor
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Setup logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting WhyteBox API v2.0...")
    logger.info(f"📍 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔧 Debug mode: {settings.DEBUG}")

    # Initialize database
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

    # Initialize Redis cache
    try:
        await cache_manager.connect()
        logger.info("✅ Redis cache connected successfully")
    except Exception as e:
        logger.warning(f"⚠️  Redis cache connection failed: {e}")
        logger.warning("   Application will continue without caching")

    # Start system monitoring
    metrics_collector.record_system_snapshot()
    logger.info("✅ Performance monitoring initialized")

    logger.info("✅ WhyteBox API is ready!")

    yield

    # Shutdown
    logger.info("👋 Shutting down WhyteBox API...")

    # Disconnect Redis
    try:
        await cache_manager.disconnect()
        logger.info("✅ Redis cache disconnected")
    except Exception as e:
        logger.error(f"❌ Redis disconnect error: {e}")

    # Log final metrics
    summary = metrics_collector.get_summary()
    logger.info(f"📊 Final metrics: {summary['requests']['total_requests']} requests processed")


# Create FastAPI application
app = FastAPI(
    title="WhyteBox API",
    description="Neural Network Visualization & Explainability Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects that strip CORS headers
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Add performance monitoring middleware
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    """Monitor request performance and record metrics"""
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Record metrics
    duration = time.time() - start_time
    endpoint = f"{request.method} {request.url.path}"
    metrics_collector.record_request(endpoint, duration, response.status_code)

    # Add performance headers
    response.headers["X-Process-Time"] = f"{duration:.4f}"

    return response


# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "WhyteBox API",
        "version": "2.0.0",
        "description": "Neural Network Visualization & Explainability Platform",
        "status": "healthy",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "version": "2.0.0", "environment": settings.ENVIRONMENT}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

# Made with Bob
