from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv
from api.notification_service import NotificationService

# Load environment variables
load_dotenv()

app = FastAPI(title="SEP Monitoring Dashboard API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize notification service
notification_service = NotificationService()

# Pydantic models
class SMSRequest(BaseModel):
    phone_number: str
    message: str

class EmailRequest(BaseModel):
    email: str
    subject: str
    message: str

class BulkSMSRequest(BaseModel):
    phone_numbers: List[str]
    message: str

class BulkEmailRequest(BaseModel):
    emails: List[str]
    subject: str
    message: str

@app.get("/")
async def root():
    return {"message": "SEP Monitoring Dashboard API is running!"}

@app.get("/notifications/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SEP Monitoring Dashboard",
        "notifications": "enabled"
    }

@app.post("/notifications/sms")
async def send_sms(request: SMSRequest):
    try:
        result = await notification_service.send_sms(request.phone_number, request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/email")
async def send_email(request: EmailRequest):
    try:
        result = await notification_service.send_email(request.email, request.subject, request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/sms/bulk")
async def send_bulk_sms(request: BulkSMSRequest):
    try:
        result = await notification_service.send_bulk_sms(request.phone_numbers, request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/email/bulk")
async def send_bulk_email(request: BulkEmailRequest):
    try:
        result = await notification_service.send_bulk_email(request.emails, request.subject, request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
