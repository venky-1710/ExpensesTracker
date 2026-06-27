"""
Cache API - In-memory cache service singleton.
"""
import time
from typing import Dict, Any, Optional
from utils.logger import logger


class CacheService:
    """Singleton in-memory cache with TTL support."""
    _instance = None
    _cache: Dict[str, Dict[str, Any]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CacheService, cls).__new__(cls)
            cls._instance._cache = {}
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if exists and not expired."""
        try:
            if key in self._cache:
                item = self._cache[key]
                if item["expires"] > time.time():
                    return item["value"]
                else:
                    del self._cache[key]
            return None
        except Exception as e:
            logger.error(f"[ERROR] CacheService.get - key={key}: {str(e)}")
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 mins)."""
        try:
            self._cache[key] = {
                "value": value,
                "expires": time.time() + ttl_seconds
            }
        except Exception as e:
            logger.error(f"[ERROR] CacheService.set - key={key}: {str(e)}")

    def clear_all(self) -> int:
        """Clear all cache entries."""
        try:
            count = len(self._cache)
            self._cache = {}
            logger.info(f"[CACHE] Cleared {count} items")
            return count
        except Exception as e:
            logger.error(f"[ERROR] CacheService.clear_all: {str(e)}")
            return 0

    def invalidate_starting_with(self, prefix: str) -> int:
        """Invalidate all keys starting with prefix."""
        try:
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._cache[k]
            if keys_to_remove:
                logger.info(f"[CACHE] Invalidated {len(keys_to_remove)} keys with prefix '{prefix}'")
            return len(keys_to_remove)
        except Exception as e:
            logger.error(f"[ERROR] CacheService.invalidate_starting_with: {str(e)}")
            return 0

    def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache for a specific user."""
        return self.invalidate_starting_with(f"user:{user_id}:")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            return {
                "items": len(self._cache),
                "keys": list(self._cache.keys())
            }
        except Exception as e:
            logger.error(f"[ERROR] CacheService.get_stats: {str(e)}")
            return {"items": 0, "keys": []}


# Global singleton instance
cache_service = CacheService()
