import os
import asyncio
from typing import List, Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import HTTPException
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        # Twilio configuration for SMS
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID', 'your_twilio_account_sid')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN', 'your_twilio_auth_token')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER', 'your_twilio_phone_number')
        
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', 'your_email@gmail.com')
        self.smtp_password = os.getenv('SMTP_PASSWORD', 'your_app_password')
        
        # Initialize Twilio client
        try:
            self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
            logger.info("Twilio client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Twilio client: {e}")
            self.twilio_client = None

    async def send_sms(self, phone_number: str, message: str) -> dict:
        """
        Send SMS using Twilio
        """
        try:
            if not self.twilio_client:
                logger.warning("Twilio client not available - SMS not sent")
                return {
                    "success": False,
                    "message": "SMS service not configured",
                    "phone": phone_number
                }

            # Format phone number (remove spaces, dashes, etc.)
            formatted_phone = ''.join(filter(str.isdigit, phone_number))
            
            # Add country code if not present (assuming US numbers)
            if not formatted_phone.startswith('1') and len(formatted_phone) == 10:
                formatted_phone = '1' + formatted_phone
            
            # Add + prefix
            if not formatted_phone.startswith('+'):
                formatted_phone = '+' + formatted_phone

            # Send SMS
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone_number,
                to=formatted_phone
            )
            
            logger.info(f"SMS sent successfully to {phone_number}: {message_obj.sid}")
            return {
                "success": True,
                "message": "SMS sent successfully",
                "phone": phone_number,
                "sid": message_obj.sid
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {phone_number}: {e}")
            return {
                "success": False,
                "message": f"Twilio error: {str(e)}",
                "phone": phone_number
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {phone_number}: {e}")
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "phone": phone_number
            }

    async def send_email(self, email: str, subject: str, message: str) -> dict:
        """
        Send email using SMTP
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(message, 'plain'))
            
            # Send email
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.smtp_username,
                password=self.smtp_password,
                use_tls=True
            )
            
            logger.info(f"Email sent successfully to {email}")
            return {
                "success": True,
                "message": "Email sent successfully",
                "email": email
            }
            
        except Exception as e:
            logger.error(f"Error sending email to {email}: {e}")
            return {
                "success": False,
                "message": f"Email error: {str(e)}",
                "email": email
            }

    async def send_bulk_sms(self, phone_numbers: List[str], message: str) -> List[dict]:
        """
        Send SMS to multiple phone numbers
        """
        tasks = [self.send_sms(phone, message) for phone in phone_numbers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "message": f"Exception: {str(result)}",
                    "phone": phone_numbers[i]
                })
            else:
                processed_results.append(result)
        
        return processed_results

    async def send_bulk_email(self, emails: List[str], subject: str, message: str) -> List[dict]:
        """
        Send email to multiple addresses
        """
        tasks = [self.send_email(email, subject, message) for email in emails]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "message": f"Exception: {str(result)}",
                    "email": emails[i]
                })
            else:
                processed_results.append(result)
        
        return processed_results

# Create a singleton instance
notification_service = NotificationService() 