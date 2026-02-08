"""
Cache utility using CacheService
"""
from functools import wraps
from fastapi import Request, Response
from services.cache_service import cache_service
from utils.logger import logger
import json
import hashlib

def cached(ttl_seconds: int = 300):
    """
    Decorator to cache API responses.
    Cache key format: "method:path:query_params:user_id:body_context"
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request object
            request: Request = kwargs.get("request")
            if not request:
                # Try finding request in args
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            # Extract user context (assumes `current_user` dependency is used)
            current_user = kwargs.get("current_user")
            user_id = "anon"
            if current_user:
                if isinstance(current_user, dict):
                    user_id = str(current_user.get("id", "anon"))
                else:
                    # Handle if current_user is an object
                    user_id = str(getattr(current_user, "id", "anon"))

            # Valid only for GET requests mainly, but we support others if needed
            # For POST requests (like search), we need body content for key
            # However, reading body in middleware/decorator can consume the stream.
            # For now, we rely on query params and user/path.
            
            # Generate Key
            if request:
                path = request.url.path
                method = request.method
                query_params = str(sorted(request.query_params.items()))
                
                # Create a minimal context hash
                context_str = f"{method}:{path}:{query_params}:{user_id}"
                key = hashlib.md5(context_str.encode()).hexdigest()
                
                # Check cache
                cached_data = cache_service.get(key)
                if cached_data:
                    logger.debug(f"⚡ Cache HIT for {path} ({user_id})")
                    return cached_data
                
                # Execute function
                response = await func(*args, **kwargs)
                
                # Cache result
                # Note: We can only cache JSON-serializable data (dict, list, Pydantic models)
                # If response is a Response object, we might not be able to cache it easily unless we extract content.
                # Assuming the route returns a Pydantic model or dict.
                cache_service.set(key, response, ttl_seconds)
                logger.debug(f"💾 Cache SET for {path} ({user_id})")
                
                return response
            
            # Fallback if no request object found (shouldn't happen in FastAPI routes if set up correctly)
            return await func(*args, **kwargs)
            
        return wrapper
    return decorator
