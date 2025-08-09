#!/usr/bin/env python3
"""
Fix Twilio phone number configuration
"""

import os
from pathlib import Path

def create_env_file():
    """Create .env file with correct Twilio configuration"""
    
    print("🔧 Fixing Twilio Phone Number Configuration")
    print("=" * 50)
    
    # Your Twilio credentials
    twilio_account_sid = "AC21b4cb8b1752e6a1cb06f4b6ef598f6f"
    twilio_auth_token = "3b68b2c015fffac942e234e2f95608f7"
    
    print("📱 Current Configuration:")
    print(f"✅ Account SID: {twilio_account_sid}")
    print(f"✅ Auth Token: {twilio_auth_token[:10]}...")
    print("❌ Phone Number: Using your personal number (needs to be Twilio number)")
    
    print("\n🔧 SOLUTION:")
    print("1. Go to https://console.twilio.com/")
    print("2. Navigate to Phone Numbers > Manage > Active numbers")
    print("3. Buy a new phone number or use an existing one")
    print("4. Copy that phone number (should look like +1234567890)")
    
    # Get the correct Twilio phone number
    twilio_phone_number = input("\nEnter your Twilio phone number (e.g., +1234567890): ").strip()
    
    if not twilio_phone_number.startswith('+'):
        print("❌ Phone number must start with +")
        return False
    
    # Email configuration (reuse existing)
    smtp_username = "asiedusamuelmensah@gmail.com"
    smtp_password = "Kwa_15_bena"
    
    # Create .env content
    env_content = f"""# Notification Service Environment Variables
# Fixed Twilio configuration

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
BACKEND_PORT=8001
FRONTEND_URL=http://localhost:3001
"""
    
    # Write .env file
    try:
        with open(".env", "w") as f:
            f.write(env_content)
        print("\n✅ .env file updated successfully!")
        print(f"✅ Twilio Phone Number: {twilio_phone_number}")
        print()
        print("📋 NEXT STEPS:")
        print("1. Restart the backend: python simple_app.py")
        print("2. Test SMS: The notification should work now")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def main():
    """Main function"""
    
    print("🚀 Fixing Twilio Phone Number Issue")
    print("=" * 50)
    print()
    print("❌ PROBLEM: You're using your personal phone number as the 'from' number")
    print("✅ SOLUTION: Use a Twilio phone number as the 'from' number")
    print()
    
    # Create .env file
    if create_env_file():
        print("\n🎉 Configuration fixed! Your SMS notifications should work now.")
        print("\n🔗 Test your setup:")
        print("python test_notification_setup.py")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")

if __name__ == "__main__":
    main()


