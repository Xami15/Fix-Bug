# SEP Monitoring Dashboard

A comprehensive motor monitoring and prediction system with AI-powered analysis, real-time data processing, and intelligent insights. **All data is sourced exclusively from real-time MQTT sensor readings - no simulated values.**

## 🚀 Key Features

### 🔍 Functional Search Bar
- **Motor Search**: Search motors by name, ID, or location
- **Real-time Results**: Instant filtering with dropdown suggestions
- **Smart Display**: Shows motor status, temperature, and vibration data
- **Professional UI**: Glassmorphism design with theme support

### 🔔 Notification System
- **Real-time Alerts**: Automatic notifications for motor anomalies
- **Email/SMS Integration**: Send alerts to configured contacts via Twilio SMS and SMTP email
- **Threshold Monitoring**: Customizable temperature and vibration limits
- **Alert History**: Persistent notification storage with read/unread status
- **Smart Deduplication**: Prevents spam notifications within 5-minute windows
- **Professional Setup**: Complete SMS/Email configuration with Twilio and Gmail integration

### 🤖 AI-Powered Analysis
- **CNN Model Integration**: Convolutional Neural Network for motor health prediction
- **Real-time Analysis**: Live motor data processing with AI insights
- **Historical Analysis**: CSV upload for offline data processing
- **Risk Assessment**: Intelligent risk scoring and trend analysis
- **AI Chatbot**: Interactive assistant for system guidance and troubleshooting

### 📊 Enhanced History & Analytics
- **Professional Interface**: Modern, responsive design with theme support
- **Advanced Filtering**: Date range, motor selection, and status filtering
- **Real-time Data**: All historical data sourced from actual MQTT sensor readings
- **Export Functionality**: CSV export for data analysis
- **Comprehensive Statistics**: Summary cards with real-time metrics
- **Sortable Tables**: Multi-column sorting with visual indicators

### 🎨 Enhanced Profile Menu
- **Professional Design**: Modern glassmorphism interface
- **User Management**: Profile picture upload and user information
- **Theme Integration**: Seamless dark/light mode switching
- **Settings Access**: Quick navigation to system configuration

### 📈 Real-time Data Integration
- **MQTT Protocol**: Exclusive use of real-time sensor data via MQTT
- **No Simulated Values**: All readings come from actual sensor hardware
- **Live Charts**: Real-time temperature and vibration visualization
- **Connection Monitoring**: Real-time MQTT connection status
- **Data Persistence**: Historical data storage and retrieval

## 🏗️ Technical Architecture

### Frontend (React)
- **React 18**: Modern React with hooks and context API
- **Real-time Updates**: MQTT client integration for live data
- **Theme System**: Dark, light, and blue theme support
- **Responsive Design**: Mobile-first approach with professional UI
- **Chart.js**: Interactive data visualization
- **React Icons**: Comprehensive icon library

### Backend (FastAPI)
- **FastAPI**: High-performance Python web framework
- **MQTT Integration**: Real-time sensor data processing
- **AI Services**: CNN model for motor health prediction
- **Database**: Supabase integration for data persistence
- **Authentication**: Firebase authentication system

### Data Flow
1. **Sensor Hardware** → MQTT Broker → Frontend (Real-time)
2. **Frontend** → Backend API → AI Model → Predictions
3. **Historical Data** → Supabase → Frontend (Analytics)

## 🎯 AI Features

### 🤖 AI Chatbot Assistant
- **Interactive Help**: Ask questions about motor monitoring, troubleshooting, and best practices
- **Voice Input**: Speech-to-text capability (ready for Web Speech API integration)
- **Contextual Responses**: Intelligent answers based on motor status and system data
- **Real-time Guidance**: Live assistance for system navigation and configuration

### 🔮 AI Prediction System
- **Real CNN Model**: Convolutional Neural Network using TensorFlow/Keras for deep learning analysis
- **Real-time Predictions**: Live motor data processing with confidence scores from MQTT sensor data
- **Historical Analysis**: CSV file upload for offline data processing
- **Risk Assessment**: Intelligent risk scoring based on multiple parameters
- **AI Insights**: Automated recommendations and maintenance suggestions
- **Model Transparency**: Clear indication of CNN vs fallback model usage
- **No Simulated Values**: All predictions based on real sensor data and actual machine learning

### 📊 Advanced Analytics
- **Trend Analysis**: Historical data processing with trend detection
- **Anomaly Detection**: Early warning system for potential failures
- **Performance Optimization**: AI-powered efficiency recommendations
- **Predictive Maintenance**: Forecast maintenance needs based on data patterns

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- MQTT Broker (test.mosquitto.org for development)
- Supabase account
- Firebase project
- Twilio account (for SMS notifications)
- Gmail account (for email notifications)

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Set up environment variables (see NOTIFICATION_SETUP.md)
# Create .env file with your Twilio and email credentials

uvicorn app:app --reload
```

### Notification Setup
For SMS and email notifications, follow the detailed setup guide in `NOTIFICATION_SETUP.md`:
1. Create a Twilio account for SMS
2. Set up Gmail app password for email
3. Configure environment variables
4. Test the notification service

### Environment Configuration
Create `.env` files with your Supabase, Firebase, Twilio, and email credentials.

## 📱 Pages Overview

### 🏠 Dashboard
- **Motor Management**: Add, remove, and monitor motors
- **3D Visualization**: Interactive motor models with real-time status
- **Quick Actions**: Motor addition wizard and troubleshooting guide
- **Real-time Status**: Live motor status indicators

### 📊 Overview
- **System Statistics**: Real-time motor counts and averages
- **Status Distribution**: Pie chart of motor health status
- **Trend Analysis**: 7-day temperature and vibration trends
- **Connection Status**: MQTT connection monitoring

### 📈 Live Data
- **Real-time Charts**: Live temperature and vibration graphs
- **Motor Selection**: Dropdown for individual motor monitoring
- **Data Validation**: Only displays actual sensor readings
- **Connection Indicators**: MQTT status with visual feedback

### 📋 History
- **Professional Interface**: Modern, responsive design
- **Advanced Filtering**: Date, motor, and status filters
- **Export Functionality**: CSV download capability
- **Real-time Updates**: Live data integration
- **Comprehensive Analytics**: Summary statistics and trends

### 🔮 Prediction
- **AI Integration**: CNN model for health prediction
- **Real-time Analysis**: Live motor data processing
- **CSV Upload**: Historical data analysis
- **Risk Assessment**: Intelligent scoring system

### ⚙️ Settings
- **Notification Configuration**: Email and SMS settings
- **Theme Management**: Dark, light, and blue themes
- **User Preferences**: Profile and system settings
- **Test Functions**: Notification testing capabilities

## 🔌 MQTT Integration

### Data Format
```json
{
  "motor_id": "MOTOR-001",
  "temperature": 45.2,
  "vibration": 0.15,
  "status": "Healthy",
  "confidence": 95.5,
  "timestamp": 1640995200
}
```

### Topics
- `motors/{motor_id}/data` - Real-time sensor data
- Automatic subscription management based on added motors

## 🎨 Theme System

### Available Themes
- **Light**: Clean, professional appearance
- **Dark**: Reduced eye strain for extended use
- **Blue**: Modern, technical aesthetic

### Theme-Aware Components
- All charts and visualizations
- Navigation and UI elements
- Data tables and forms
- Status indicators and alerts

## 📊 Data Management

### Real-time Data
- **MQTT Integration**: Direct sensor data via MQTT protocol
- **Live Updates**: Real-time temperature and vibration monitoring
- **Connection Monitoring**: Automatic reconnection and status tracking
- **Data Validation**: Type checking and null value handling

### Historical Data
- **Supabase Storage**: Persistent data storage
- **Local Caching**: Browser-based data caching
- **Export Capabilities**: CSV download for analysis
- **Data Limits**: Automatic cleanup to prevent memory issues

## 🔒 Security Features

- **Firebase Authentication**: Secure user management
- **Supabase RLS**: Row-level security for data access
- **Environment Variables**: Secure credential management
- **Input Validation**: Client and server-side validation

## 🚀 Performance Optimizations

- **Real-time Updates**: Efficient MQTT data processing
- **Chart Optimization**: Responsive chart rendering
- **Memory Management**: Automatic data cleanup
- **Lazy Loading**: Component-based code splitting

## 🔧 Development

### Code Structure
```
src/
├── components/     # Reusable UI components
├── context/        # React context providers
├── pages/          # Main application pages
├── services/       # API and external service integration
├── utils/          # Utility functions and helpers
└── styles/         # CSS and styling files
```

### Key Technologies
- **React**: Frontend framework
- **MQTT.js**: Real-time communication
- **Chart.js**: Data visualization
- **FastAPI**: Backend API
- **Supabase**: Database and authentication
- **Firebase**: User authentication

## 📈 Future Enhancements

- **Advanced AI Models**: Enhanced prediction algorithms
- **Mobile App**: Native mobile application
- **IoT Integration**: Direct sensor hardware integration
- **Advanced Analytics**: Machine learning insights
- **Multi-tenant Support**: Enterprise features
- **API Documentation**: Comprehensive API docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting guide in the dashboard
- Review the AI chatbot for common issues
- Open an issue on GitHub

---

**Note**: This system exclusively uses real-time MQTT sensor data. All readings, charts, and analytics are based on actual sensor hardware readings - no simulated or mock data is used in production.
