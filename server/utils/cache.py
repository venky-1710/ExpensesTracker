"""
Cache utility decorator using CacheService
"""
from functools import wraps
from fastapi import Request
from apis.cache_api import cache_service
from utils.logger import logger
import hashlib


def cached(ttl_seconds: int = 300):
    """
    Decorator to cache API responses.
    Cache key format: "user:{user_id}:{context_hash}"
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request object
            request: Request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # Extract user context
            current_user = kwargs.get("current_user")
            user_id = "anon"
            if current_user:
                if isinstance(current_user, dict):
                    user_id = str(current_user.get("id", "anon"))
                else:
                    user_id = str(getattr(current_user, "id", "anon"))

            # Generate Key
            if request:
                path = request.url.path
                method = request.method
                query_params = str(sorted(request.query_params.items()))

                context_str = f"{method}:{path}:{query_params}"
                context_hash = hashlib.md5(context_str.encode()).hexdigest()
                key = f"user:{user_id}:{context_hash}"

                # Check cache
                cached_data = cache_service.get(key)
                if cached_data:
                    logger.debug(f"[CACHE_HIT] {path} ({user_id})")
                    return cached_data

                # Execute function
                response = await func(*args, **kwargs)

                # Cache result
                cache_service.set(key, response, ttl_seconds)
                logger.debug(f"[CACHE_SET] {path} ({user_id})")

                return response

            # Fallback if no request object found
            return await func(*args, **kwargs)

        return wrapper
    return decorator
