"""
Monitoring and Health Check Endpoints

Provides endpoints for system health checks, performance metrics,
and cache statistics.

Author: WhyteBox Team
Date: 2026-02-26
"""

from typing import Any, Dict

from app.core.cache import CacheManager, get_cache
from app.core.monitoring import (HealthChecker, MetricsCollector, get_health_checker, get_metrics,
                                 get_monitor)
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()


@router.get("/health", tags=["monitoring"])
async def health_check(
    health_checker: HealthChecker = Depends(get_health_checker),
) -> Dict[str, Any]:
    """
    Comprehensive health check endpoint.

    Returns:
        Health status with system metrics and issues
    """
    return health_checker.check_health()


@router.get("/health/simple", tags=["monitoring"])
async def simple_health_check(
    health_checker: HealthChecker = Depends(get_health_checker),
) -> Dict[str, str]:
    """
    Simple health check for load balancers.

    Returns:
        {"status": "healthy"} or raises 503
    """
    if health_checker.is_healthy():
        return {"status": "healthy"}
    else:
        raise HTTPException(status_code=503, detail="Service unhealthy")


@router.get("/metrics", tags=["monitoring"])
async def get_metrics_summary(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, Any]:
    """
    Get comprehensive metrics summary.

    Returns:
        Complete metrics including requests, models, cache, and system stats
    """
    return metrics.get_summary()


@router.get("/metrics/requests", tags=["monitoring"])
async def get_request_metrics(
    minutes: int = 5, metrics: MetricsCollector = Depends(get_metrics)
) -> Dict[str, Any]:
    """
    Get request metrics for the last N minutes.

    Args:
        minutes: Time window in minutes (default: 5)

    Returns:
        Request statistics including latency percentiles and error rates
    """
    return metrics.get_request_stats(minutes)


@router.get("/metrics/endpoints", tags=["monitoring"])
async def get_endpoint_metrics(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, Any]:
    """
    Get per-endpoint statistics.

    Returns:
        Statistics for each API endpoint
    """
    return {"endpoints": metrics.get_endpoint_stats()}


@router.get("/metrics/models", tags=["monitoring"])
async def get_model_metrics(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, Any]:
    """
    Get model inference statistics.

    Returns:
        Statistics for each model including inference times
    """
    return {"models": metrics.get_model_stats()}


@router.get("/metrics/explainability", tags=["monitoring"])
async def get_explainability_metrics(
    metrics: MetricsCollector = Depends(get_metrics),
) -> Dict[str, Any]:
    """
    Get explainability method statistics.

    Returns:
        Statistics for each explainability method
    """
    return {"methods": metrics.get_explainability_stats()}


@router.get("/metrics/cache", tags=["monitoring"])
async def get_cache_metrics(cache: CacheManager = Depends(get_cache)) -> Dict[str, Any]:
    """
    Get cache statistics.

    Returns:
        Cache hit rate, total requests, and operation counts
    """
    return cache.get_stats()


@router.get("/metrics/system", tags=["monitoring"])
async def get_system_metrics(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, Any]:
    """
    Get system resource metrics.

    Returns:
        CPU, memory, and disk usage statistics
    """
    return metrics.get_system_stats()


@router.post("/metrics/reset", tags=["monitoring"])
async def reset_metrics(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, str]:
    """
    Reset all metrics counters.

    Returns:
        Success message
    """
    metrics.reset()
    return {"message": "Metrics reset successfully"}


@router.get("/cache/info", tags=["monitoring"])
async def get_cache_info(cache: CacheManager = Depends(get_cache)) -> Dict[str, Any]:
    """
    Get Redis server information.

    Returns:
        Redis version, memory usage, and keyspace info
    """
    return await cache.get_info()


@router.post("/cache/clear", tags=["monitoring"])
async def clear_cache(cache: CacheManager = Depends(get_cache)) -> Dict[str, str]:
    """
    Clear all cache entries. Use with caution!

    Returns:
        Success message
    """
    success = await cache.clear_all()
    if success:
        return {"message": "Cache cleared successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to clear cache")


@router.delete("/cache/pattern/{pattern}", tags=["monitoring"])
async def delete_cache_pattern(
    pattern: str, cache: CacheManager = Depends(get_cache)
) -> Dict[str, Any]:
    """
    Delete cache entries matching pattern.

    Args:
        pattern: Redis key pattern (e.g., "model:*")

    Returns:
        Number of keys deleted
    """
    deleted = await cache.delete_pattern(pattern)
    return {"pattern": pattern, "deleted_count": deleted}


@router.get("/uptime", tags=["monitoring"])
async def get_uptime(metrics: MetricsCollector = Depends(get_metrics)) -> Dict[str, Any]:
    """
    Get service uptime information.

    Returns:
        Start time and uptime duration
    """
    return metrics.get_uptime()


# Made with Bob
