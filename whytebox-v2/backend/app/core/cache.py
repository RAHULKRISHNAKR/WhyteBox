"""
Redis Cache Manager for WhyteBox Platform

Provides caching functionality for models, inference results, and explainability outputs.
Supports TTL-based expiration, cache invalidation, and performance monitoring.

Author: WhyteBox Team
Date: 2026-02-26
"""

import hashlib
import json
import logging
import pickle
from datetime import timedelta
from typing import Any, Dict, List, Optional, Union

import redis.asyncio as redis
from app.core.config import settings
from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class CacheKeyBuilder:
    """Build consistent cache keys for different data types."""

    @staticmethod
    def model_key(model_id: str) -> str:
        """Generate cache key for model metadata."""
        return f"model:{model_id}"

    @staticmethod
    def model_weights_key(model_id: str) -> str:
        """Generate cache key for model weights."""
        return f"model:weights:{model_id}"

    @staticmethod
    def inference_key(model_id: str, image_hash: str) -> str:
        """Generate cache key for inference results."""
        return f"inference:{model_id}:{image_hash}"

    @staticmethod
    def explainability_key(model_id: str, image_hash: str, method: str, params_hash: str) -> str:
        """Generate cache key for explainability results."""
        return f"explain:{model_id}:{image_hash}:{method}:{params_hash}"

    @staticmethod
    def batch_inference_key(model_id: str, batch_hash: str) -> str:
        """Generate cache key for batch inference results."""
        return f"batch:inference:{model_id}:{batch_hash}"

    @staticmethod
    def user_models_key(user_id: str) -> str:
        """Generate cache key for user's model list."""
        return f"user:models:{user_id}"

    @staticmethod
    def hash_data(data: Union[bytes, str, Dict]) -> str:
        """Generate hash for data to use in cache keys."""
        if isinstance(data, dict):
            data = json.dumps(data, sort_keys=True)
        if isinstance(data, str):
            data = data.encode()
        return hashlib.sha256(data).hexdigest()[:16]


class CacheManager:
    """
    Redis-based cache manager with support for different data types and TTLs.

    Features:
    - Model metadata and weights caching
    - Inference result caching
    - Explainability result caching
    - Automatic TTL management
    - Cache invalidation strategies
    - Performance metrics
    """

    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self.key_builder = CacheKeyBuilder()
        self._stats = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0, "errors": 0}

    async def connect(self):
        """Establish connection to Redis."""
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=False,  # We'll handle encoding ourselves
                max_connections=settings.REDIS_MAX_CONNECTIONS,
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Successfully connected to Redis")
        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")

    @property
    def is_connected(self) -> bool:
        """Return True if Redis client is available."""
        return self.redis_client is not None

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.is_connected:
            self._stats["misses"] += 1
            return None
        try:
            value = await self.redis_client.get(key)
            if value is not None:
                self._stats["hits"] += 1
                # Try to unpickle, fall back to string
                try:
                    return pickle.loads(value)
                except (pickle.PickleError, TypeError):
                    return value.decode() if isinstance(value, bytes) else value
            else:
                self._stats["misses"] += 1
                return None
        except RedisError as e:
            self._stats["errors"] += 1
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None for no expiration)

        Returns:
            True if successful, False otherwise
        """
        if not self.is_connected:
            return False
        try:
            # Serialize value
            if isinstance(value, (str, int, float)):
                serialized = str(value).encode()
            else:
                serialized = pickle.dumps(value)

            if ttl:
                await self.redis_client.setex(key, ttl, serialized)
            else:
                await self.redis_client.set(key, serialized)

            self._stats["sets"] += 1
            return True
        except RedisError as e:
            self._stats["errors"] += 1
            logger.error(f"Cache set error for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False otherwise
        """
        if not self.is_connected:
            return False
        try:
            result = await self.redis_client.delete(key)
            self._stats["deletes"] += 1
            return result > 0
        except RedisError as e:
            self._stats["errors"] += 1
            logger.error(f"Cache delete error for key {key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Redis key pattern (e.g., "model:*")

        Returns:
            Number of keys deleted
        """
        if not self.is_connected:
            return 0
        try:
            keys = []
            async for key in self.redis_client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                deleted = await self.redis_client.delete(*keys)
                self._stats["deletes"] += deleted
                return deleted
            return 0
        except RedisError as e:
            self._stats["errors"] += 1
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self.is_connected:
            return False
        try:
            return await self.redis_client.exists(key) > 0
        except RedisError as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """Get remaining TTL for key in seconds."""
        if not self.is_connected:
            return None
        try:
            ttl = await self.redis_client.ttl(key)
            return ttl if ttl > 0 else None
        except RedisError as e:
            logger.error(f"Cache TTL error for key {key}: {e}")
            return None

    async def extend_ttl(self, key: str, additional_seconds: int) -> bool:
        """Extend TTL for existing key."""
        try:
            current_ttl = await self.get_ttl(key)
            if current_ttl:
                new_ttl = current_ttl + additional_seconds
                return await self.redis_client.expire(key, new_ttl)
            return False
        except RedisError as e:
            logger.error(f"Cache extend TTL error for key {key}: {e}")
            return False

    # Model-specific caching methods

    async def cache_model(self, model_id: str, model_data: Dict, ttl: int = 3600) -> bool:
        """Cache model metadata."""
        key = self.key_builder.model_key(model_id)
        return await self.set(key, model_data, ttl)

    async def get_model(self, model_id: str) -> Optional[Dict]:
        """Get cached model metadata."""
        key = self.key_builder.model_key(model_id)
        return await self.get(key)

    async def invalidate_model(self, model_id: str) -> bool:
        """Invalidate all cache entries for a model."""
        pattern = f"*{model_id}*"
        deleted = await self.delete_pattern(pattern)
        logger.info(f"Invalidated {deleted} cache entries for model {model_id}")
        return deleted > 0

    # Inference result caching

    async def cache_inference(
        self, model_id: str, image_data: bytes, result: Dict, ttl: int = 1800
    ) -> bool:
        """Cache inference result."""
        image_hash = self.key_builder.hash_data(image_data)
        key = self.key_builder.inference_key(model_id, image_hash)
        return await self.set(key, result, ttl)

    async def get_inference(self, model_id: str, image_data: bytes) -> Optional[Dict]:
        """Get cached inference result."""
        image_hash = self.key_builder.hash_data(image_data)
        key = self.key_builder.inference_key(model_id, image_hash)
        return await self.get(key)

    # Explainability result caching

    async def cache_explainability(
        self,
        model_id: str,
        image_data: bytes,
        method: str,
        params: Dict,
        result: Dict,
        ttl: int = 3600,
    ) -> bool:
        """Cache explainability result."""
        image_hash = self.key_builder.hash_data(image_data)
        params_hash = self.key_builder.hash_data(params)
        key = self.key_builder.explainability_key(model_id, image_hash, method, params_hash)
        return await self.set(key, result, ttl)

    async def get_explainability(
        self, model_id: str, image_data: bytes, method: str, params: Dict
    ) -> Optional[Dict]:
        """Get cached explainability result."""
        image_hash = self.key_builder.hash_data(image_data)
        params_hash = self.key_builder.hash_data(params)
        key = self.key_builder.explainability_key(model_id, image_hash, method, params_hash)
        return await self.get(key)

    # User-specific caching

    async def cache_user_models(self, user_id: str, models: List[Dict], ttl: int = 600) -> bool:
        """Cache user's model list."""
        key = self.key_builder.user_models_key(user_id)
        return await self.set(key, models, ttl)

    async def get_user_models(self, user_id: str) -> Optional[List[Dict]]:
        """Get cached user's model list."""
        key = self.key_builder.user_models_key(user_id)
        return await self.get(key)

    async def invalidate_user_models(self, user_id: str) -> bool:
        """Invalidate user's model list cache."""
        key = self.key_builder.user_models_key(user_id)
        return await self.delete(key)

    # Cache statistics and monitoring

    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = self._stats["hits"] / total_requests * 100 if total_requests > 0 else 0

        return {**self._stats, "total_requests": total_requests, "hit_rate": round(hit_rate, 2)}

    def reset_stats(self):
        """Reset cache statistics."""
        self._stats = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0, "errors": 0}

    async def get_info(self) -> Dict[str, Any]:
        """Get Redis server info."""
        if not self.is_connected:
            return {"status": "Redis not connected (running without cache)"}
        try:
            info = await self.redis_client.info()
            return {
                "redis_version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace": info.get("db0", {}),
            }
        except RedisError as e:
            logger.error(f"Failed to get Redis info: {e}")
            return {}

    async def clear_all(self) -> bool:
        """Clear all cache entries. Use with caution!"""
        if not self.is_connected:
            return False
        try:
            await self.redis_client.flushdb()
            logger.warning("Cleared all cache entries")
            return True
        except RedisError as e:
            logger.error(f"Failed to clear cache: {e}")
            return False


# Global cache manager instance
cache_manager = CacheManager()


async def get_cache() -> CacheManager:
    """Dependency to get cache manager instance."""
    return cache_manager


# Made with Bob
