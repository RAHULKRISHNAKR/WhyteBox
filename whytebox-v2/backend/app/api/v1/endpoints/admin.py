"""
Admin API Endpoints for WhyteBox Platform

Provides endpoints for:
- API key management
- Rate limit monitoring
- System configuration
- User management

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.api_keys import (
    APIKeyManager,
    APIKeyCreate,
    APIKeyResponse,
    APIKeyListResponse,
    require_admin
)
from app.core.rate_limiter import RateLimiter, RateLimitTier
from app.core.error_handlers import (
    NotFoundAPIError,
    ValidationAPIError,
    ForbiddenAPIError
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# API Key Management Endpoints
# ============================================================================

@router.post(
    "/api-keys",
    response_model=APIKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate new API key",
    description="Generate a new API key with specified scopes and expiration"
)
async def create_api_key(
    key_data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Generate a new API key.
    
    **Note:** The plain API key is only returned once during creation.
    Store it securely as it cannot be retrieved later.
    
    Args:
        key_data: API key configuration
        db: Database session
        current_user: Authenticated admin user
        
    Returns:
        APIKeyResponse with the plain key (only shown once)
    """
    manager = APIKeyManager(db)
    
    # Validate expiration
    if key_data.expires_in_days and key_data.expires_in_days > 365:
        raise ValidationAPIError(
            message="API key expiration cannot exceed 365 days",
            details={"max_days": 365}
        )
    
    # Generate key
    result = manager.generate_key(
        user_id=key_data.user_id or current_user.id,
        name=key_data.name,
        scopes=key_data.scopes,
        expires_in_days=key_data.expires_in_days
    )
    
    logger.info(
        f"API key created: {result['key_id']} for user {result['user_id']}",
        extra={
            "key_id": result["key_id"],
            "user_id": result["user_id"],
            "scopes": result["scopes"]
        }
    )
    
    return APIKeyResponse(**result)


@router.get(
    "/api-keys",
    response_model=APIKeyListResponse,
    summary="List API keys",
    description="List all API keys with optional filtering"
)
async def list_api_keys(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    active_only: bool = Query(True, description="Show only active keys"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List API keys with pagination and filtering.
    
    Args:
        user_id: Optional user ID filter
        active_only: Show only active (non-revoked, non-expired) keys
        skip: Pagination offset
        limit: Maximum results
        db: Database session
        current_user: Authenticated admin user
        
    Returns:
        List of API keys (without plain keys)
    """
    manager = APIKeyManager(db)
    
    keys = manager.list_keys(
        user_id=user_id,
        active_only=active_only,
        skip=skip,
        limit=limit
    )
    
    return APIKeyListResponse(
        keys=keys,
        total=len(keys),
        skip=skip,
        limit=limit
    )


@router.get(
    "/api-keys/{key_id}",
    response_model=APIKeyResponse,
    summary="Get API key details",
    description="Get detailed information about a specific API key"
)
async def get_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get API key details.
    
    Args:
        key_id: API key ID
        db: Database session
        current_user: Authenticated admin user
        
    Returns:
        API key details (without plain key)
    """
    manager = APIKeyManager(db)
    
    key = manager.get_key_by_id(key_id)
    if not key:
        raise NotFoundAPIError("API key", key_id)
    
    return APIKeyResponse(
        key_id=key.key_id,
        user_id=key.user_id,
        name=key.name,
        scopes=key.scopes,
        created_at=key.created_at,
        expires_at=key.expires_at,
        last_used_at=key.last_used_at,
        usage_count=key.usage_count,
        is_active=key.is_active
    )


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke API key",
    description="Revoke an API key (cannot be undone)"
)
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Revoke an API key.
    
    Args:
        key_id: API key ID to revoke
        db: Database session
        current_user: Authenticated admin user
    """
    manager = APIKeyManager(db)
    
    success = manager.revoke_key(key_id)
    if not success:
        raise NotFoundAPIError("API key", key_id)
    
    logger.info(
        f"API key revoked: {key_id}",
        extra={"key_id": key_id, "admin_user": current_user.id}
    )


@router.post(
    "/api-keys/{key_id}/rotate",
    response_model=APIKeyResponse,
    summary="Rotate API key",
    description="Generate a new key while revoking the old one"
)
async def rotate_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Rotate an API key (generate new, revoke old).
    
    Args:
        key_id: API key ID to rotate
        db: Database session
        current_user: Authenticated admin user
        
    Returns:
        New API key (with plain key shown once)
    """
    manager = APIKeyManager(db)
    
    # Get old key
    old_key = manager.get_key_by_id(key_id)
    if not old_key:
        raise NotFoundAPIError("API key", key_id)
    
    # Generate new key with same settings
    result = manager.generate_key(
        user_id=old_key.user_id,
        name=f"{old_key.name} (rotated)",
        scopes=old_key.scopes,
        expires_in_days=None  # Keep same expiration logic
    )
    
    # Revoke old key
    manager.revoke_key(key_id)
    
    logger.info(
        f"API key rotated: {key_id} -> {result['key_id']}",
        extra={
            "old_key_id": key_id,
            "new_key_id": result["key_id"],
            "user_id": old_key.user_id
        }
    )
    
    return APIKeyResponse(**result)


# ============================================================================
# Rate Limit Management Endpoints
# ============================================================================

@router.get(
    "/rate-limits/stats",
    summary="Get rate limit statistics",
    description="Get current rate limit usage statistics"
)
async def get_rate_limit_stats(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    current_user: User = Depends(require_admin)
):
    """
    Get rate limit statistics.
    
    Args:
        user_id: Optional user ID filter
        current_user: Authenticated admin user
        
    Returns:
        Rate limit statistics
    """
    limiter = RateLimiter()
    
    # Get stats from Redis
    stats = await limiter.get_stats(user_id=user_id)
    
    return {
        "stats": stats,
        "tiers": {
            "FREE": {"requests_per_minute": 10, "requests_per_hour": 100},
            "BASIC": {"requests_per_minute": 30, "requests_per_hour": 500},
            "PRO": {"requests_per_minute": 100, "requests_per_hour": 2000},
            "ENTERPRISE": {"requests_per_minute": 1000, "requests_per_hour": 20000}
        }
    }


@router.post(
    "/rate-limits/reset",
    summary="Reset rate limits",
    description="Reset rate limits for a specific user or IP"
)
async def reset_rate_limits(
    user_id: Optional[int] = Query(None, description="User ID to reset"),
    ip_address: Optional[str] = Query(None, description="IP address to reset"),
    current_user: User = Depends(require_admin)
):
    """
    Reset rate limits.
    
    Args:
        user_id: Optional user ID
        ip_address: Optional IP address
        current_user: Authenticated admin user
        
    Returns:
        Success message
    """
    if not user_id and not ip_address:
        raise ValidationAPIError(
            message="Must provide either user_id or ip_address"
        )
    
    limiter = RateLimiter()
    
    if user_id:
        await limiter.reset_limits(f"user:{user_id}")
        logger.info(f"Rate limits reset for user {user_id}")
    
    if ip_address:
        await limiter.reset_limits(f"ip:{ip_address}")
        logger.info(f"Rate limits reset for IP {ip_address}")
    
    return {
        "message": "Rate limits reset successfully",
        "user_id": user_id,
        "ip_address": ip_address
    }


# ============================================================================
# System Configuration Endpoints
# ============================================================================

@router.get(
    "/config",
    summary="Get system configuration",
    description="Get current system configuration"
)
async def get_system_config(
    current_user: User = Depends(require_admin)
):
    """
    Get system configuration.
    
    Args:
        current_user: Authenticated admin user
        
    Returns:
        System configuration
    """
    from app.core.config import settings
    
    return {
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "api_version": "v1",
        "features": {
            "websocket": True,
            "caching": settings.REDIS_URL is not None,
            "rate_limiting": True,
            "api_keys": True
        },
        "limits": {
            "max_request_size": "100MB",
            "max_file_size": "50MB",
            "max_models_per_user": 100
        }
    }


@router.get(
    "/health/detailed",
    summary="Get detailed health status",
    description="Get detailed system health information"
)
async def get_detailed_health(
    current_user: User = Depends(require_admin)
):
    """
    Get detailed health status.
    
    Args:
        current_user: Authenticated admin user
        
    Returns:
        Detailed health information
    """
    from app.core.config import settings
    import psutil
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Database health
    db_healthy = True
    try:
        db = next(get_db())
        db.execute("SELECT 1")
        db.close()
    except Exception as e:
        db_healthy = False
        logger.error(f"Database health check failed: {e}")
    
    # Redis health
    redis_healthy = False
    if settings.REDIS_URL:
        try:
            from app.core.cache import cache_manager
            redis_healthy = await cache_manager.health_check()
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "type": "postgresql"
            },
            "cache": {
                "status": "healthy" if redis_healthy else "unavailable",
                "type": "redis"
            }
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": memory.available / (1024**3),
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / (1024**3)
        }
    }

# Made with Bob
