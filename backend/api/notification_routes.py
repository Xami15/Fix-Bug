from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from .notification_service import notification_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])

class SMSRequest(BaseModel):
    phone_number: str
    message: str

class EmailRequest(BaseModel):
    email: EmailStr
    subject: str
    message: str

class BulkSMSRequest(BaseModel):
    phone_numbers: List[str]
    message: str

class BulkEmailRequest(BaseModel):
    emails: List[EmailStr]
    subject: str
    message: str

class NotificationResponse(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None

@router.post("/sms", response_model=NotificationResponse)
async def send_sms(request: SMSRequest):
    """
    Send a single SMS
    """
    try:
        result = await notification_service.send_sms(request.phone_number, request.message)
        return NotificationResponse(
            success=result["success"],
            message=result["message"],
            details=result
        )
    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")

@router.post("/email", response_model=NotificationResponse)
async def send_email(request: EmailRequest):
    """
    Send a single email
    """
    try:
        result = await notification_service.send_email(request.email, request.subject, request.message)
        return NotificationResponse(
            success=result["success"],
            message=result["message"],
            details=result
        )
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.post("/sms/bulk", response_model=List[NotificationResponse])
async def send_bulk_sms(request: BulkSMSRequest):
    """
    Send SMS to multiple phone numbers
    """
    try:
        results = await notification_service.send_bulk_sms(request.phone_numbers, request.message)
        return [
            NotificationResponse(
                success=result["success"],
                message=result["message"],
                details=result
            ) for result in results
        ]
    except Exception as e:
        logger.error(f"Error sending bulk SMS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send bulk SMS: {str(e)}")

@router.post("/email/bulk", response_model=List[NotificationResponse])
async def send_bulk_email(request: BulkEmailRequest):
    """
    Send email to multiple addresses
    """
    try:
        results = await notification_service.send_bulk_email(request.emails, request.subject, request.message)
        return [
            NotificationResponse(
                success=result["success"],
                message=result["message"],
                details=result
            ) for result in results
        ]
    except Exception as e:
        logger.error(f"Error sending bulk email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send bulk email: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Check notification service health
    """
    return {
        "status": "healthy",
        "sms_service": notification_service.twilio_client is not None,
        "email_service": True  # SMTP service is always available
    } 