"""
Rate Limit Headers Middleware for WhyteBox Platform

Adds rate limit information to response headers for client visibility.

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add rate limit information to response headers.
    
    Adds the following headers:
    - X-RateLimit-Limit: Maximum requests allowed in the window
    - X-RateLimit-Remaining: Remaining requests in current window
    - X-RateLimit-Reset: Unix timestamp when the limit resets
    - Retry-After: Seconds to wait before retrying (when rate limited)
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.limiter = RateLimiter()
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Add rate limit headers to response"""
        
        # Process request
        response = await call_next(request)
        
        # Skip for health check and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return response
        
        try:
            # Get client identifier
            client_id = self.limiter.get_client_identifier(request)
            
            # Get rate limit info
            limit_info = await self.limiter.get_limit_info(client_id)
            
            if limit_info:
                # Add headers
                response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
                response.headers["X-RateLimit-Remaining"] = str(limit_info["remaining"])
                response.headers["X-RateLimit-Reset"] = str(limit_info["reset_at"])
                
                # Add Retry-After if rate limited
                if response.status_code == 429:
                    retry_after = limit_info["reset_at"] - int(limit_info["current_time"])
                    response.headers["Retry-After"] = str(max(1, retry_after))
        
        except Exception as e:
            # Don't fail the request if we can't add headers
            logger.warning(f"Failed to add rate limit headers: {e}")
        
        return response

# Made with Bob
