from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_user
from models.payloads import ChatRequest, ChatResponse, UserInDB
from services.chat_service import generate_chat_response
from utils.logger import logger

router = APIRouter()

@router.post("", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        response_text = await generate_chat_response(
            user_id=str(current_user["id"]),
            message=request.message,
            history=request.history
        )
        return ChatResponse(response=response_text)
    except Exception as e:
        logger.error(f"Chat Error: {e}")
        print(f"CRITICAL CHAT ERROR: {e}") # Force print to console
        import traceback
        traceback.print_exc()
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
