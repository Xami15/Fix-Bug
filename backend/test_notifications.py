#!/usr/bin/env python3
"""
Test script for notification service
Run this to test SMS and email functionality
"""

import asyncio
import os
from dotenv import load_dotenv
from api.notification_service import notification_service

# Load environment variables
load_dotenv()

async def test_notifications():
    print("🔔 Testing Notification Service")
    print("=" * 50)
    
    # Check if environment variables are set
    print("\n1. Checking environment variables...")
    twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER')
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = os.getenv('SMTP_PORT')
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')
    
    print(f"Twilio Account SID: {'✅ Set' if twilio_account_sid else '❌ Missing'}")
    print(f"Twilio Auth Token: {'✅ Set' if twilio_auth_token else '❌ Missing'}")
    print(f"Twilio Phone Number: {'✅ Set' if twilio_phone_number else '❌ Missing'}")
    print(f"SMTP Server: {'✅ Set' if smtp_server else '❌ Missing'}")
    print(f"SMTP Port: {'✅ Set' if smtp_port else '❌ Missing'}")
    print(f"SMTP Username: {'✅ Set' if smtp_username else '❌ Missing'}")
    print(f"SMTP Password: {'✅ Set' if smtp_password else '❌ Missing'}")
    
    # Test SMS (if configured)
    print("\n2. Testing SMS service...")
    test_phone = os.getenv('TEST_PHONE_NUMBER')
    if test_phone and twilio_account_sid and twilio_auth_token and twilio_phone_number:
        try:
            result = await notification_service.send_sms(test_phone, "SEP Monitor: Test SMS from notification service!")
            if result['success']:
                print(f"✅ SMS sent successfully to {test_phone}")
            else:
                print(f"❌ SMS failed: {result['message']}")
        except Exception as e:
            print(f"❌ SMS test failed: {e}")
    else:
        print("⚠️  SMS not configured - missing required environment variables")
        if not test_phone:
            print("   - TEST_PHONE_NUMBER not set")
        if not twilio_account_sid:
            print("   - TWILIO_ACCOUNT_SID not set")
        if not twilio_auth_token:
            print("   - TWILIO_AUTH_TOKEN not set")
        if not twilio_phone_number:
            print("   - TWILIO_PHONE_NUMBER not set")
    
    # Test Email (if configured)
    print("\n3. Testing Email service...")
    test_email = os.getenv('TEST_EMAIL')
    if test_email and smtp_server and smtp_username and smtp_password:
        try:
            result = await notification_service.send_email(
                test_email, 
                "SEP Monitor - Test Email", 
                "This is a test email from the SEP Monitor notification service!"
            )
            if result['success']:
                print(f"✅ Email sent successfully to {test_email}")
            else:
                print(f"❌ Email failed: {result['message']}")
        except Exception as e:
            print(f"❌ Email test failed: {e}")
    else:
        print("⚠️  Email not configured - missing required environment variables")
        if not test_email:
            print("   - TEST_EMAIL not set")
        if not smtp_server:
            print("   - SMTP_SERVER not set")
        if not smtp_username:
            print("   - SMTP_USERNAME not set")
        if not smtp_password:
            print("   - SMTP_PASSWORD not set")
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\n📝 To set up notifications, follow the instructions in NOTIFICATION_SETUP.md")

if __name__ == "__main__":
    asyncio.run(test_notifications()) 