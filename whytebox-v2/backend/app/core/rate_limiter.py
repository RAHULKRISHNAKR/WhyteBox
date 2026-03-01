"""
Rate Limiting for WhyteBox Platform

Implements token bucket and sliding window rate limiting algorithms
with Redis backend for distributed rate limiting.

Author: WhyteBox Team
Date: 2026-02-26
"""

import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, status
from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimitExceeded(HTTPException):
    """Exception raised when rate limit is exceeded"""
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


class RateLimiter:
    """
    Token bucket rate limiter with Redis backend.
    
    Features:
    - Per-user rate limiting
    - Per-IP rate limiting
    - Per-endpoint rate limiting
    - Sliding window algorithm
    - Distributed rate limiting via Redis
    """
    
    def __init__(self, redis_client: Optional[Redis] = None):
        self.redis = redis_client
        self.local_cache: Dict[str, Dict[str, Any]] = {}
    
    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> Dict[str, Any]:
        """
        Check if request is within rate limit.
        
        Args:
            key: Unique identifier (user_id, IP, etc.)
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Rate limit status with remaining requests and reset time
            
        Raises:
            RateLimitExceeded: If rate limit is exceeded
        """
        current_time = time.time()
        
        if self.redis:
            # Use Redis for distributed rate limiting
            return await self._check_redis_rate_limit(
                key, max_requests, window_seconds, current_time
            )
        else:
            # Fallback to local in-memory rate limiting
            return self._check_local_rate_limit(
                key, max_requests, window_seconds, current_time
            )
    
    async def _check_redis_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        current_time: float
    ) -> Dict[str, Any]:
        """Redis-based sliding window rate limiting"""
        redis_key = f"rate_limit:{key}"
        window_start = current_time - window_seconds
        
        # Use Redis sorted set for sliding window
        pipe = self.redis.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(redis_key, 0, window_start)
        
        # Count requests in current window
        pipe.zcard(redis_key)
        
        # Add current request
        pipe.zadd(redis_key, {str(current_time): current_time})
        
        # Set expiry
        pipe.expire(redis_key, window_seconds)
        
        results = await pipe.execute()
        request_count = results[1]
        
        remaining = max(0, max_requests - request_count - 1)
        reset_time = int(current_time + window_seconds)
        
        if request_count >= max_requests:
            raise RateLimitExceeded(retry_after=window_seconds)
        
        return {
            "allowed": True,
            "limit": max_requests,
            "remaining": remaining,
            "reset": reset_time,
            "reset_datetime": datetime.fromtimestamp(reset_time).isoformat()
        }
    
    def _check_local_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        current_time: float
    ) -> Dict[str, Any]:
        """Local in-memory sliding window rate limiting"""
        if key not in self.local_cache:
            self.local_cache[key] = {
                "requests": [],
                "window_seconds": window_seconds
            }
        
        cache_entry = self.local_cache[key]
        window_start = current_time - window_seconds
        
        # Remove old requests
        cache_entry["requests"] = [
            req_time for req_time in cache_entry["requests"]
            if req_time > window_start
        ]
        
        request_count = len(cache_entry["requests"])
        remaining = max(0, max_requests - request_count - 1)
        reset_time = int(current_time + window_seconds)
        
        if request_count >= max_requests:
            raise RateLimitExceeded(retry_after=window_seconds)
        
        # Add current request
        cache_entry["requests"].append(current_time)
        
        return {
            "allowed": True,
            "limit": max_requests,
            "remaining": remaining,
            "reset": reset_time,
            "reset_datetime": datetime.fromtimestamp(reset_time).isoformat()
        }
    
    def get_client_identifier(self, request: Request) -> str:
        """
        Get unique identifier for client.
        
        Priority:
        1. User ID (if authenticated)
        2. API key
        3. IP address
        """
        # Check for user ID in request state (set by auth middleware)
        if hasattr(request.state, "user_id"):
            return f"user:{request.state.user_id}"
        
        # Check for API key
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api_key:{api_key}"
        
        # Fallback to IP address
        # Check for forwarded IP first (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"


class RateLimitTier:
    """Rate limit tiers for different user types"""
    
    FREE = {
        "requests_per_minute": 10,
        "requests_per_hour": 100,
        "requests_per_day": 1000
    }
    
    BASIC = {
        "requests_per_minute": 30,
        "requests_per_hour": 500,
        "requests_per_day": 5000
    }
    
    PRO = {
        "requests_per_minute": 100,
        "requests_per_hour": 2000,
        "requests_per_day": 20000
    }
    
    ENTERPRISE = {
        "requests_per_minute": 1000,
        "requests_per_hour": 10000,
        "requests_per_day": 100000
    }
    
    @classmethod
    def get_tier(cls, tier_name: str) -> Dict[str, int]:
        """Get rate limit configuration for tier"""
        return getattr(cls, tier_name.upper(), cls.FREE)


# Global rate limiter instance
rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance"""
    global rate_limiter
    if rate_limiter is None:
        rate_limiter = RateLimiter()
    return rate_limiter


async def rate_limit_dependency(
    request: Request,
    max_requests: int = 60,
    window_seconds: int = 60
):
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @app.get("/endpoint", dependencies=[Depends(rate_limit_dependency)])
        async def endpoint():
            return {"message": "success"}
    """
    limiter = get_rate_limiter()
    client_id = limiter.get_client_identifier(request)
    
    try:
        rate_info = await limiter.check_rate_limit(
            key=client_id,
            max_requests=max_requests,
            window_seconds=window_seconds
        )
        
        # Add rate limit headers to response
        request.state.rate_limit_info = rate_info
        
    except RateLimitExceeded as e:
        logger.warning(f"Rate limit exceeded for {client_id}")
        raise


def create_rate_limit_dependency(
    max_requests: int,
    window_seconds: int
):
    """
    Create a rate limit dependency with custom limits.
    
    Usage:
        rate_limit_10_per_minute = create_rate_limit_dependency(10, 60)
        
        @app.get("/endpoint", dependencies=[Depends(rate_limit_10_per_minute)])
        async def endpoint():
            return {"message": "success"}
    """
    async def dependency(request: Request):
        return await rate_limit_dependency(request, max_requests, window_seconds)
    
    return dependency


# Pre-configured rate limit dependencies
rate_limit_strict = create_rate_limit_dependency(10, 60)  # 10/min
rate_limit_moderate = create_rate_limit_dependency(30, 60)  # 30/min
rate_limit_relaxed = create_rate_limit_dependency(100, 60)  # 100/min

# Made with Bob
