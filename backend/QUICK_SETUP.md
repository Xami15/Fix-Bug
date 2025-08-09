# 🔧 Quick Notification Setup Guide

## 🚀 Fast Setup (5 minutes)

### Step 1: Run the Setup Script
```bash
cd backend
python setup_notifications.py
```

### Step 2: Get Your Credentials

#### 📧 Gmail Setup (2 minutes)
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Generate app password for "Mail"
5. Copy the 16-character password

#### 📱 Twilio Setup (3 minutes)
1. Go to https://www.twilio.com and sign up
2. Get Account SID and Auth Token from console
3. Buy a phone number ($1/month)
4. Copy the phone number

### Step 3: Test Notifications
```bash
# Start backend
python app.py

# In another terminal, start frontend
cd ..
npm start
```

## 🔍 Manual Setup

If you prefer manual setup, create a `.env` file in the `backend` directory:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# App Configuration
BACKEND_HOST=localhost
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

## ✅ Testing

1. **Check Backend Health:**
   ```bash
   curl http://localhost:8000/notifications/health
   ```

2. **Test in Frontend:**
   - Go to Settings page
   - Add your email/phone
   - Click "Send Test Email/SMS"

3. **Check Notifications:**
   - Look for the bell icon in topbar
   - Click to see notification dropdown

## 🆘 Troubleshooting

### Email Issues
- ✅ Use App Password, not regular password
- ✅ Enable 2-Step Verification first
- ✅ Check spam folder

### SMS Issues
- ✅ Verify Twilio credentials
- ✅ Check account has credits
- ✅ Use correct phone format (+1234567890)

### Backend Issues
- ✅ Ensure backend is running on port 8000
- ✅ Check .env file exists and has correct values
- ✅ Restart backend after changing .env

## 💰 Cost Information

- **Gmail**: Free
- **Twilio SMS**: ~$0.0075 per SMS
- **Twilio Phone**: ~$1/month

## 🆘 Need Help?

1. Check browser console for errors
2. Check backend logs for detailed errors
3. Verify all environment variables are set
4. Test with curl commands first


