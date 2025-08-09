# Notification Setup Guide

This guide will help you set up real SMS and email notifications for the SEP Monitoring Dashboard.

## Prerequisites

1. **Twilio Account** (for SMS)
2. **Gmail Account** (for email) or any other SMTP provider

## SMS Setup (Twilio)

### 1. Create a Twilio Account
1. Go to [Twilio.com](https://www.twilio.com) and sign up for a free account
2. Verify your phone number during signup
3. Get your Account SID and Auth Token from the Twilio Console

### 2. Get a Twilio Phone Number
1. In the Twilio Console, go to "Phone Numbers" > "Manage" > "Buy a number"
2. Purchase a phone number (free trial accounts get $15 credit)
3. Note down the phone number

### 3. Set Environment Variables
Create a `.env` file in the `backend` directory with:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

## Email Setup (Gmail)

### 1. Enable 2-Step Verification
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled

### 2. Generate App Password
1. In Google Account settings, go to Security > App passwords
2. Select "Mail" as the app
3. Generate a new app password
4. Copy the generated password

### 3. Set Environment Variables
Add these to your `.env` file:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
```

## Alternative Email Providers

### Outlook/Hotmail
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your_email@outlook.com
SMTP_PASSWORD=your_password
```

### Yahoo
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your_email@yahoo.com
SMTP_PASSWORD=your_app_password
```

## Testing the Setup

1. Start the backend server:
   ```bash
   cd backend
   python -m uvicorn app:app --reload
   ```

2. Test the notification service:
   ```bash
   curl http://localhost:8000/notifications/health
   ```

3. In the frontend, go to Settings page and:
   - Add your email/phone number
   - Click "Send Test Email" or "Send Test SMS"
   - Check if you receive the notifications

## Troubleshooting

### SMS Issues
- Verify your Twilio credentials are correct
- Check that your Twilio account has sufficient credits
- Ensure the phone number format is correct (include country code)

### Email Issues
- Verify your SMTP credentials
- Check that 2-Step Verification is enabled (for Gmail)
- Ensure you're using an App Password, not your regular password
- Check your spam folder

### Backend Connection Issues
- Ensure the backend server is running on port 8000
- Check that CORS is properly configured
- Verify the frontend is making requests to the correct URL

## Security Notes

- Never commit your `.env` file to version control
- Keep your Twilio Auth Token and email passwords secure
- Regularly rotate your app passwords
- Monitor your Twilio usage to avoid unexpected charges

## Cost Considerations

- **Twilio SMS**: ~$0.0075 per SMS (US numbers)
- **Gmail**: Free (with app password)
- **Other providers**: Varies by provider

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Check the backend logs for detailed error information
3. Verify all environment variables are set correctly
4. Test with a simple curl command first 