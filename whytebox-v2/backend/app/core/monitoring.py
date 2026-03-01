"""
Performance Monitoring for WhyteBox Platform

Tracks API performance, model inference times, cache hit rates, and system metrics.
Provides real-time monitoring and historical analysis capabilities.

Author: WhyteBox Team
Date: 2026-02-26
"""

import time
import psutil
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from functools import wraps

import numpy as np

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collect and aggregate performance metrics.
    
    Features:
    - Request timing
    - Model inference timing
    - Cache hit rate tracking
    - System resource monitoring
    - Error rate tracking
    """
    
    def __init__(self, max_history: int = 1000):
        """
        Initialize metrics collector.
        
        Args:
            max_history: Maximum number of historical entries to keep
        """
        self.max_history = max_history
        
        # Request metrics
        self.request_times: deque = deque(maxlen=max_history)
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.request_errors: Dict[str, int] = defaultdict(int)
        
        # Model metrics
        self.inference_times: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_history)
        )
        self.model_loads: Dict[str, int] = defaultdict(int)
        
        # Explainability metrics
        self.explainability_times: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_history)
        )
        
        # Cache metrics (updated externally)
        self.cache_stats: Dict[str, int] = {
            "hits": 0,
            "misses": 0,
            "sets": 0
        }
        
        # System metrics
        self.system_snapshots: deque = deque(maxlen=100)
        
        # Start time
        self.start_time = datetime.utcnow()
    
    def record_request(
        self,
        endpoint: str,
        duration: float,
        status_code: int
    ):
        """Record API request metrics."""
        self.request_times.append({
            "endpoint": endpoint,
            "duration": duration,
            "status_code": status_code,
            "timestamp": datetime.utcnow()
        })
        self.request_counts[endpoint] += 1
        
        if status_code >= 400:
            self.request_errors[endpoint] += 1
    
    def record_inference(self, model_id: str, duration: float):
        """Record model inference time."""
        self.inference_times[model_id].append({
            "duration": duration,
            "timestamp": datetime.utcnow()
        })
    
    def record_model_load(self, model_id: str):
        """Record model load event."""
        self.model_loads[model_id] += 1
    
    def record_explainability(self, method: str, duration: float):
        """Record explainability method execution time."""
        self.explainability_times[method].append({
            "duration": duration,
            "timestamp": datetime.utcnow()
        })
    
    def update_cache_stats(self, stats: Dict[str, int]):
        """Update cache statistics."""
        self.cache_stats = stats
    
    def record_system_snapshot(self):
        """Record current system resource usage."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            self.system_snapshots.append({
                "timestamp": datetime.utcnow(),
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024**3),
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_used_gb": disk.used / (1024**3)
            })
        except Exception as e:
            logger.error(f"Failed to record system snapshot: {e}")
    
    def get_request_stats(self, minutes: int = 5) -> Dict[str, Any]:
        """Get request statistics for the last N minutes."""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        recent_requests = [
            r for r in self.request_times
            if r["timestamp"] > cutoff
        ]
        
        if not recent_requests:
            return {
                "total_requests": 0,
                "avg_duration_ms": 0,
                "min_duration_ms": 0,
                "max_duration_ms": 0,
                "p50_duration_ms": 0,
                "p95_duration_ms": 0,
                "p99_duration_ms": 0,
                "error_rate": 0,
                "requests_per_minute": 0
            }
        
        durations = [r["duration"] * 1000 for r in recent_requests]
        errors = sum(1 for r in recent_requests if r["status_code"] >= 400)
        
        return {
            "total_requests": len(recent_requests),
            "avg_duration_ms": round(np.mean(durations), 2),
            "min_duration_ms": round(np.min(durations), 2),
            "max_duration_ms": round(np.max(durations), 2),
            "p50_duration_ms": round(np.percentile(durations, 50), 2),
            "p95_duration_ms": round(np.percentile(durations, 95), 2),
            "p99_duration_ms": round(np.percentile(durations, 99), 2),
            "error_rate": round(errors / len(recent_requests) * 100, 2),
            "requests_per_minute": round(len(recent_requests) / minutes, 2)
        }
    
    def get_endpoint_stats(self) -> List[Dict[str, Any]]:
        """Get statistics per endpoint."""
        stats = []
        for endpoint, count in self.request_counts.items():
            endpoint_requests = [
                r for r in self.request_times
                if r["endpoint"] == endpoint
            ]
            
            if endpoint_requests:
                durations = [r["duration"] * 1000 for r in endpoint_requests]
                errors = self.request_errors.get(endpoint, 0)
                
                stats.append({
                    "endpoint": endpoint,
                    "total_requests": count,
                    "avg_duration_ms": round(np.mean(durations), 2),
                    "error_count": errors,
                    "error_rate": round(errors / count * 100, 2) if count > 0 else 0
                })
        
        return sorted(stats, key=lambda x: x["total_requests"], reverse=True)
    
    def get_model_stats(self) -> List[Dict[str, Any]]:
        """Get statistics per model."""
        stats = []
        for model_id, times in self.inference_times.items():
            if times:
                durations = [t["duration"] * 1000 for t in times]
                stats.append({
                    "model_id": model_id,
                    "total_inferences": len(times),
                    "total_loads": self.model_loads.get(model_id, 0),
                    "avg_inference_ms": round(np.mean(durations), 2),
                    "min_inference_ms": round(np.min(durations), 2),
                    "max_inference_ms": round(np.max(durations), 2),
                    "p95_inference_ms": round(np.percentile(durations, 95), 2)
                })
        
        return sorted(stats, key=lambda x: x["total_inferences"], reverse=True)
    
    def get_explainability_stats(self) -> List[Dict[str, Any]]:
        """Get statistics per explainability method."""
        stats = []
        for method, times in self.explainability_times.items():
            if times:
                durations = [t["duration"] * 1000 for t in times]
                stats.append({
                    "method": method,
                    "total_executions": len(times),
                    "avg_duration_ms": round(np.mean(durations), 2),
                    "min_duration_ms": round(np.min(durations), 2),
                    "max_duration_ms": round(np.max(durations), 2),
                    "p95_duration_ms": round(np.percentile(durations, 95), 2)
                })
        
        return sorted(stats, key=lambda x: x["total_executions"], reverse=True)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = (
            self.cache_stats["hits"] / total * 100
            if total > 0
            else 0
        )
        
        return {
            **self.cache_stats,
            "total_requests": total,
            "hit_rate": round(hit_rate, 2)
        }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get current system statistics."""
        if not self.system_snapshots:
            self.record_system_snapshot()
        
        if self.system_snapshots:
            latest = self.system_snapshots[-1]
            
            # Calculate averages over last 10 snapshots
            recent = list(self.system_snapshots)[-10:]
            avg_cpu = np.mean([s["cpu_percent"] for s in recent])
            avg_memory = np.mean([s["memory_percent"] for s in recent])
            
            return {
                "current": {
                    "cpu_percent": latest["cpu_percent"],
                    "memory_percent": latest["memory_percent"],
                    "memory_used_gb": round(latest["memory_used_gb"], 2),
                    "memory_available_gb": round(latest["memory_available_gb"], 2),
                    "disk_percent": latest["disk_percent"],
                    "disk_used_gb": round(latest["disk_used_gb"], 2)
                },
                "average": {
                    "cpu_percent": round(avg_cpu, 2),
                    "memory_percent": round(avg_memory, 2)
                }
            }
        
        return {}
    
    def get_uptime(self) -> Dict[str, Any]:
        """Get service uptime."""
        uptime = datetime.utcnow() - self.start_time
        return {
            "start_time": self.start_time.isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "uptime_formatted": str(uptime).split('.')[0]
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary."""
        return {
            "uptime": self.get_uptime(),
            "requests": self.get_request_stats(),
            "endpoints": self.get_endpoint_stats()[:10],  # Top 10
            "models": self.get_model_stats()[:10],  # Top 10
            "explainability": self.get_explainability_stats(),
            "cache": self.get_cache_stats(),
            "system": self.get_system_stats()
        }
    
    def reset(self):
        """Reset all metrics."""
        self.request_times.clear()
        self.request_counts.clear()
        self.request_errors.clear()
        self.inference_times.clear()
        self.model_loads.clear()
        self.explainability_times.clear()
        self.cache_stats = {"hits": 0, "misses": 0, "sets": 0}
        self.system_snapshots.clear()
        self.start_time = datetime.utcnow()
        logger.info("Metrics reset")


class PerformanceMonitor:
    """
    Performance monitoring with timing decorators and context managers.
    """
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
    
    @asynccontextmanager
    async def track_request(self, endpoint: str):
        """Context manager to track request timing."""
        start_time = time.time()
        status_code = 200
        
        try:
            yield
        except Exception as e:
            status_code = 500
            raise
        finally:
            duration = time.time() - start_time
            self.metrics.record_request(endpoint, duration, status_code)
    
    @asynccontextmanager
    async def track_inference(self, model_id: str):
        """Context manager to track inference timing."""
        start_time = time.time()
        
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.metrics.record_inference(model_id, duration)
    
    @asynccontextmanager
    async def track_explainability(self, method: str):
        """Context manager to track explainability timing."""
        start_time = time.time()
        
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.metrics.record_explainability(method, duration)
    
    def track_time(self, metric_name: str):
        """Decorator to track function execution time."""
        def decorator(func: Callable):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    return result
                finally:
                    duration = time.time() - start_time
                    logger.debug(f"{metric_name} took {duration*1000:.2f}ms")
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    duration = time.time() - start_time
                    logger.debug(f"{metric_name} took {duration*1000:.2f}ms")
            
            # Return appropriate wrapper based on function type
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator


class HealthChecker:
    """
    System health checking functionality.
    """
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.thresholds = {
            "cpu_percent": 90.0,
            "memory_percent": 90.0,
            "disk_percent": 90.0,
            "error_rate": 5.0,
            "avg_response_time_ms": 1000.0
        }
    
    def check_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check.
        
        Returns:
            Health status with details
        """
        issues = []
        warnings = []
        
        # Check system resources
        system_stats = self.metrics.get_system_stats()
        if system_stats:
            current = system_stats["current"]
            
            if current["cpu_percent"] > self.thresholds["cpu_percent"]:
                issues.append(f"High CPU usage: {current['cpu_percent']}%")
            elif current["cpu_percent"] > self.thresholds["cpu_percent"] * 0.8:
                warnings.append(f"Elevated CPU usage: {current['cpu_percent']}%")
            
            if current["memory_percent"] > self.thresholds["memory_percent"]:
                issues.append(f"High memory usage: {current['memory_percent']}%")
            elif current["memory_percent"] > self.thresholds["memory_percent"] * 0.8:
                warnings.append(f"Elevated memory usage: {current['memory_percent']}%")
            
            if current["disk_percent"] > self.thresholds["disk_percent"]:
                issues.append(f"High disk usage: {current['disk_percent']}%")
        
        # Check request metrics
        request_stats = self.metrics.get_request_stats()
        if request_stats["total_requests"] > 0:
            if request_stats["error_rate"] > self.thresholds["error_rate"]:
                issues.append(f"High error rate: {request_stats['error_rate']}%")
            
            if request_stats["avg_duration_ms"] > self.thresholds["avg_response_time_ms"]:
                warnings.append(
                    f"Slow response time: {request_stats['avg_duration_ms']}ms"
                )
        
        # Determine overall status
        if issues:
            status = "unhealthy"
        elif warnings:
            status = "degraded"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "issues": issues,
            "warnings": warnings,
            "uptime": self.metrics.get_uptime(),
            "metrics": {
                "requests": request_stats,
                "system": system_stats
            }
        }
    
    def is_healthy(self) -> bool:
        """Quick health check."""
        health = self.check_health()
        return health["status"] == "healthy"


# Global instances
metrics_collector = MetricsCollector()
performance_monitor = PerformanceMonitor(metrics_collector)
health_checker = HealthChecker(metrics_collector)


def get_metrics() -> MetricsCollector:
    """Dependency to get metrics collector."""
    return metrics_collector


def get_monitor() -> PerformanceMonitor:
    """Dependency to get performance monitor."""
    return performance_monitor


def get_health_checker() -> HealthChecker:
    """Dependency to get health checker."""
    return health_checker

# Made with Bob
