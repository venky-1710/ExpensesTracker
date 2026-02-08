import time
from typing import Dict, Any, Optional
from utils.logger import logger

class CacheService:
    _instance = None
    _cache: Dict[str, Dict[str, Any]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CacheService, cls).__new__(cls)
            cls._instance._cache = {}
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if exists and not expired"""
        if key in self._cache:
            item = self._cache[key]
            if item["expires"] > time.time():
                # logger.debug(f"cache HIT: {key}")
                return item["value"]
            else:
                # logger.debug(f"cache EXPIRED: {key}")
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 mins)"""
        # logger.debug(f"cache SET: {key} (ttl={ttl_seconds}s)")
        self._cache[key] = {
            "value": value,
            "expires": time.time() + ttl_seconds
        }

    def clear_all(self):
        """Clear all cache"""
        count = len(self._cache)
        self._cache = {}
        logger.info(f"🧹 Cache cleared ({count} items removed)")
        return count

    def get_stats(self):
        """Get cache statistics"""
        return {
            "items": len(self._cache),
            "keys": list(self._cache.keys())
        }

# Global instance
cache_service = CacheService()
