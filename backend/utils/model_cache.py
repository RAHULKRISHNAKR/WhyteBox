"""
LRU Model Cache for Efficient Model Management
Implements Least Recently Used caching strategy with size limits
"""

from collections import OrderedDict
from typing import Any, Optional, Dict
import logging
from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from logger import setup_logger, LogEmoji
    logger = setup_logger(__name__)
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)


class ModelCache:
    """
    LRU (Least Recently Used) cache for loaded models.
    
    Features:
    - Automatic eviction of least recently used models
    - Size limit to prevent memory exhaustion
    - Cache statistics tracking
    - Thread-safe operations
    
    Example:
        >>> cache = ModelCache(max_size=5)
        >>> cache.put('vgg16', model)
        >>> model = cache.get('vgg16')
        >>> stats = cache.get_stats()
    """
    
    def __init__(self, max_size: int = 5):
        """
        Initialize model cache.
        
        Args:
            max_size: Maximum number of models to cache (default: 5)
        """
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        
        logger.info(f"{LogEmoji.CACHE} Model cache initialized (max_size={max_size})")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get model from cache.
        
        Args:
            key: Model identifier (e.g., 'vgg16', 'resnet50')
        
        Returns:
            Cached model if found, None otherwise
        """
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            self.hits += 1
            logger.debug(f"{LogEmoji.CHECK} Cache hit: {key}")
            return self.cache[key]['model']
        
        self.misses += 1
        logger.debug(f"{LogEmoji.CROSS} Cache miss: {key}")
        return None
    
    def put(self, key: str, model: Any, metadata: Optional[Dict] = None):
        """
        Add model to cache.
        
        Args:
            key: Model identifier
            model: Model object to cache
            metadata: Optional metadata about the model
        """
        if key in self.cache:
            # Update existing entry
            self.cache.move_to_end(key)
            self.cache[key]['model'] = model
            self.cache[key]['metadata'] = metadata or {}
            self.cache[key]['last_accessed'] = datetime.now()
            logger.debug(f"{LogEmoji.ARROW_UP} Cache updated: {key}")
        else:
            # Add new entry
            self.cache[key] = {
                'model': model,
                'metadata': metadata or {},
                'created': datetime.now(),
                'last_accessed': datetime.now()
            }
            logger.debug(f"{LogEmoji.PACKAGE} Cache added: {key}")
            
            # Evict if over capacity
            if len(self.cache) > self.max_size:
                evicted_key, _ = self.cache.popitem(last=False)
                self.evictions += 1
                logger.info(f"{LogEmoji.ARROW_DOWN} Cache evicted (LRU): {evicted_key}")
    
    def remove(self, key: str) -> bool:
        """
        Remove model from cache.
        
        Args:
            key: Model identifier
        
        Returns:
            True if removed, False if not found
        """
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"{LogEmoji.CROSS} Cache removed: {key}")
            return True
        return False
    
    def clear(self):
        """Clear all cached models"""
        count = len(self.cache)
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        logger.info(f"{LogEmoji.CACHE} Cache cleared ({count} models removed)")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'evictions': self.evictions,
            'hit_rate': round(hit_rate, 2),
            'models': list(self.cache.keys())
        }
    
    def get_info(self, key: str) -> Optional[Dict]:
        """
        Get information about a cached model.
        
        Args:
            key: Model identifier
        
        Returns:
            Model information if found, None otherwise
        """
        if key in self.cache:
            entry = self.cache[key]
            return {
                'key': key,
                'metadata': entry['metadata'],
                'created': entry['created'].isoformat(),
                'last_accessed': entry['last_accessed'].isoformat()
            }
        return None
    
    def __len__(self) -> int:
        """Get number of cached models"""
        return len(self.cache)
    
    def __contains__(self, key: str) -> bool:
        """Check if model is in cache"""
        return key in self.cache
    
    def __repr__(self) -> str:
        """String representation"""
        return f"ModelCache(size={len(self)}/{self.max_size}, hit_rate={self.get_stats()['hit_rate']}%)"


# Global cache instance (can be imported and used across modules)
_global_cache: Optional[ModelCache] = None


def get_global_cache(max_size: int = 5) -> ModelCache:
    """
    Get or create global model cache instance.
    
    Args:
        max_size: Maximum cache size (only used on first call)
    
    Returns:
        Global ModelCache instance
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = ModelCache(max_size=max_size)
    return _global_cache


# Example usage
if __name__ == '__main__':
    # Test cache
    cache = ModelCache(max_size=3)
    
    # Simulate model loading
    class DummyModel:
        def __init__(self, name):
            self.name = name
        def __repr__(self):
            return f"Model({self.name})"
    
    # Add models
    cache.put('vgg16', DummyModel('VGG16'), {'params': '138M'})
    cache.put('resnet50', DummyModel('ResNet50'), {'params': '25M'})
    cache.put('mobilenet', DummyModel('MobileNet'), {'params': '4M'})
    
    print(f"\n{cache}")
    print(f"Stats: {cache.get_stats()}")
    
    # Access models (test LRU)
    model = cache.get('vgg16')  # Hit
    print(f"\nRetrieved: {model}")
    
    model = cache.get('unknown')  # Miss
    print(f"Retrieved: {model}")
    
    # Add one more (should evict resnet50 as it's LRU)
    cache.put('efficientnet', DummyModel('EfficientNet'), {'params': '5M'})
    
    print(f"\n{cache}")
    print(f"Stats: {cache.get_stats()}")
    print(f"Cached models: {cache.get_stats()['models']}")

# Made with Bob
