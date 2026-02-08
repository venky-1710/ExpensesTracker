"""
Simple in-memory cache utility
"""
import time
from functools import wraps
from typing import Dict, Any, Optional

class SimpleCache:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if exists and not expired"""
        if key in self._cache:
            item = self._cache[key]
            if item["expires"] > time.time():
                return item["value"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 mins)"""
        self._cache[key] = {
            "value": value,
            "expires": time.time() + ttl_seconds
        }

    def clear(self):
        """Clear all cache"""
        self._cache = {}

# Global cache instance
cache = SimpleCache()

def cached(ttl_seconds: int = 300):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create key from function name and arguments
            # Note: This is a simple key generation, might need improvement for complex args
            key_parts = [func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
            key = ":".join(key_parts)
            
            # Check cache
            cached_val = cache.get(key)
            if cached_val is not None:
                return cached_val
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            cache.set(key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
