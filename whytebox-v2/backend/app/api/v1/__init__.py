"""
API v1 Router

Main router that includes all API endpoints.
"""

from app.api.v1.endpoints import (conversion, explainability, inference, models, monitoring,
                                  streaming_inference, websocket)
from fastapi import APIRouter

# Create main API router
api_router = APIRouter()


@api_router.get("/")
async def api_root():
    """API v1 root endpoint"""
    return {
        "message": "WhyteBox API v1",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "models": "/api/v1/models",
            "inference": "/api/v1/inference",
            "explainability": "/api/v1/explainability",
            "monitoring": "/api/v1/monitoring",
            "websocket": "/api/v1/ws",
            "conversion": "/api/v1/conversion",
        },
        "documentation": {"swagger": "/docs", "redoc": "/redoc"},
    }


# Include sub-routers
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(inference.router, prefix="/inference", tags=["inference"])
api_router.include_router(explainability.router, prefix="/explainability", tags=["explainability"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(websocket.router, tags=["websocket"])
api_router.include_router(streaming_inference.router, tags=["streaming"])
api_router.include_router(
    conversion.router, prefix="/conversion", tags=["conversion", "optimization"]
)

# Made with Bob
