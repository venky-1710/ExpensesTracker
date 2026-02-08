from fastapi import APIRouter, status, Depends
from services.cache_service import cache_service
from models.payloads import APIResponse
from utils.auth import get_current_user

router = APIRouter()

@router.post("/clear", response_model=APIResponse)
async def clear_cache(current_user: dict = Depends(get_current_user)):
    """Clear all server-side cache"""
    count = cache_service.clear_all()
    return APIResponse(
        success=True,
        data={"cleared_items": count},
        message="Cache cleared successfully"
    )

@router.get("/stats", response_model=APIResponse)
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """Get cache statistics"""
    stats = cache_service.get_stats()
    return APIResponse(
        success=True,
        data=stats
    )
