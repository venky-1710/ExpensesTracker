"""
Cache routes - Cache management endpoints
"""
from fastapi import APIRouter, Depends
from apis.cache_api import cache_service
from models.payloads import APIResponse
from utils.auth import get_current_user
from utils.helpers import api_handler

router = APIRouter()


@router.post("/clear", response_model=APIResponse)
@api_handler
async def clear_cache(current_user: dict = Depends(get_current_user)):
    """Clear all server-side cache."""
    count = cache_service.clear_all()
    return APIResponse(
        success=True,
        data={"cleared_items": count},
    )


@router.get("/stats", response_model=APIResponse)
@api_handler
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """Get cache statistics."""
    stats = cache_service.get_stats()
    return APIResponse(success=True, data=stats)
