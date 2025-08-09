#!/usr/bin/env python3
"""
Test script to verify notification environment variables are properly configured
"""

import os
from dotenv import load_dotenv

def test_env_variables():
    """Test if all required environment variables are set"""
    
    print("🔍 Testing Notification Environment Variables")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Required variables
    required_vars = {
        'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
        'TWILIO_AUTH_TOKEN': 'Twilio Auth Token', 
        'TWILIO_PHONE_NUMBER': 'Twilio Phone Number',
        'SMTP_SERVER': 'SMTP Server',
        'SMTP_PORT': 'SMTP Port',
        'SMTP_USERNAME': 'SMTP Username',
        'SMTP_PASSWORD': 'SMTP Password'
    }
    
    all_good = True
    
    print("\n📋 Checking Environment Variables:")
    print("-" * 40)
    
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value and value not in ['your_twilio_account_sid', 'your_email@gmail.com', 'your_app_password']:
            print(f"✅ {description}: {value[:10]}..." if len(value) > 10 else f"✅ {description}: {value}")
        else:
            print(f"❌ {description}: NOT SET or using placeholder")
            all_good = False
    
    print("\n📊 Summary:")
    print("-" * 40)
    
    if all_good:
        print("🎉 All environment variables are properly configured!")
        print("✅ You can now start the backend server and test notifications")
    else:
        print("⚠️  Some environment variables are missing or using placeholder values")
        print("📝 Please run the setup script: python setup_notifications.py")
    
    return all_good

def test_notification_service():
    """Test the notification service initialization"""
    
    print("\n🔧 Testing Notification Service:")
    print("-" * 40)
    
    try:
        from api.notification_service import NotificationService
        
        # Initialize service
        service = NotificationService()
        
        # Check Twilio
        if service.twilio_client:
            print("✅ Twilio client initialized successfully")
        else:
            print("❌ Twilio client failed to initialize")
        
        # Check SMTP settings
        print(f"✅ SMTP Server: {service.smtp_server}:{service.smtp_port}")
        print(f"✅ SMTP Username: {service.smtp_username}")
        
        if service.smtp_password and service.smtp_password != 'your_app_password':
            print("✅ SMTP Password: Configured")
        else:
            print("❌ SMTP Password: Not configured")
            
        return True
        
    except Exception as e:
        print(f"❌ Error testing notification service: {e}")
        return False

def main():
    """Main test function"""
    
    print("🚀 Notification Setup Test")
    print("=" * 50)
    
    # Test environment variables
    env_ok = test_env_variables()
    
    # Test notification service
    service_ok = test_notification_service()
    
    print("\n📋 RECOMMENDATIONS:")
    print("-" * 40)
    
    if env_ok and service_ok:
        print("🎉 Everything is ready!")
        print("1. Start the backend: python app.py")
        print("2. Test notifications in the frontend")
        print("3. Check the notification bell icon")
    else:
        print("🔧 Setup needed:")
        print("1. Run: python setup_notifications.py")
        print("2. Get your Twilio and Gmail credentials")
        print("3. Run this test again")
    
    print("\n📚 Useful Links:")
    print("- Twilio Console: https://console.twilio.com/")
    print("- Google App Passwords: https://myaccount.google.com/apppasswords")
    print("- Setup Guide: QUICK_SETUP.md")

if __name__ == "__main__":
    main()


