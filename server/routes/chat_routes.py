"""
Chat routes - AI chatbot endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_user
from models.payloads import ChatRequest, ChatResponse, UserInDB, ThreadTitleUpdate
from apis.chat_api import generate_chat_response, get_chat_history, update_thread_title, delete_thread
from utils.helpers import api_handler

router = APIRouter()

@router.get("/history")
@api_handler
async def get_history(current_user: UserInDB = Depends(get_current_user)):
    """Get chat history spanning the last 7 days."""
    history = await get_chat_history(str(current_user["id"]), limit=200)
    return {"success": True, "data": history}


@router.put("/history/{thread_id}/title")
@api_handler
async def update_title(
    thread_id: str,
    title_update: ThreadTitleUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Rename a specific chat thread."""
    success = await update_thread_title(str(current_user["id"]), thread_id, title_update.title)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found or update failed")
    return {"success": True, "message": "Thread name updated"}


@router.delete("/history/{thread_id}")
@api_handler
async def delete_history(
    thread_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a specific chat thread."""
    success = await delete_thread(str(current_user["id"]), thread_id)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found or could not be deleted")
    return {"success": True, "message": "Thread deleted"}



@router.post("", response_model=ChatResponse)
@api_handler
async def chat_with_ai(
    request: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Chat with AI financial assistant."""
    response_text, thread_id = await generate_chat_response(
        user_id=str(current_user["id"]),
        message=request.message,
        thread_id=request.thread_id
    )
    return ChatResponse(response=response_text, thread_id=thread_id)
