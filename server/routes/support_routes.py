from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from apis.support_api import send_contact_email

router = APIRouter(tags=["support"])

class ContactRequest(BaseModel):
    firstName: str
    lastName: str
    workEmail: EmailStr
    phoneNumber: str
    message: str

@router.post("/contact")
async def contact_us(req: ContactRequest):
    """
    Endpoint for contact form submissions.
    """
    if not req.message or len(req.message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
    return await send_contact_email(
        first_name=req.firstName,
        last_name=req.lastName,
        work_email=req.workEmail,
        phone_number=req.phoneNumber,
        message=req.message
    )
