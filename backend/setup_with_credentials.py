#!/usr/bin/env python3
"""
Quick setup script with provided Twilio credentials
"""

import os
from pathlib import Path

def create_env_file():
    """Create .env file with provided credentials"""
    
    print("🔧 Setting up notifications with your Twilio credentials")
    print("=" * 60)
    
    # Your Twilio credentials
    twilio_account_sid = "AC21b4cb8b1752e6a1cb06f4b6ef598f6f"
    twilio_auth_token = "3b68b2c015fffac942e234e2f95608f7"
    twilio_phone_number = "+2330593199740"  # Your phone number
    
    print("📱 SMS Configuration:")
    print(f"✅ Account SID: {twilio_account_sid}")
    print(f"✅ Auth Token: {twilio_auth_token[:10]}...")
    print(f"✅ Phone Number: {twilio_phone_number}")
    
    print("\n📧 Email Configuration:")
    print("Please provide your Gmail credentials:")
    
    # Email configuration
    smtp_username = input("Gmail Address: ").strip()
    smtp_password = input("App Password (16 characters): ").strip()
    
    # Create .env content
    env_content = f"""# Notification Service Environment Variables
# Generated with your Twilio credentials

# =============================================================================
# TWILIO SMS CONFIGURATION
# =============================================================================
TWILIO_ACCOUNT_SID={twilio_account_sid}
TWILIO_AUTH_TOKEN={twilio_auth_token}
TWILIO_PHONE_NUMBER={twilio_phone_number}

# =============================================================================
# EMAIL SMTP CONFIGURATION
# =============================================================================
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME={smtp_username}
SMTP_PASSWORD={smtp_password}

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
BACKEND_HOST=localhost
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
"""
    
    # Write .env file
    try:
        with open(".env", "w") as f:
            f.write(env_content)
        print("\n✅ .env file created successfully!")
        print()
        print("📋 NEXT STEPS:")
        print("1. Test the setup: python test_notification_setup.py")
        print("2. Start the backend: python app.py")
        print("3. Test notifications in the frontend")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def main():
    """Main setup function"""
    
    print("🚀 Quick Notification Setup with Your Credentials")
    print("=" * 60)
    
    # Create .env file
    if create_env_file():
        print("\n🎉 Setup complete! Your notification system is ready to use.")
        print("\n🔗 Test your setup:")
        print("python test_notification_setup.py")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")

if __name__ == "__main__":
    main()


