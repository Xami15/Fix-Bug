import React, { useState, useRef, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useMotors } from '../context/MotorsContext';
import { FaRobot, FaPaperPlane, FaTimes, FaMicrophone, FaMicrophoneSlash, FaSearch, FaImage, FaChartLine, FaCog, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your SEP Monitoring AI Assistant. I'm here to help you with motor monitoring, technical analysis, and general questions. I can provide real-time insights, troubleshoot issues, or just chat about various topics. What would you like to know?",
      timestamp: new Date(),
      data: null
    }
  ]);
  const [suggestions] = useState([
    "Show motor status",
    "Analyze temperature data", 
    "Check vibration levels",
    "System overview",
    "Tell me about yourself"
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const messagesEndRef = useRef(null);
  const { theme } = useContext(ThemeContext);
  const { motors, liveMotorDataHistory } = useMotors();

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          botBg: "rgba(59, 130, 246, 0.1)",
          userBg: "rgba(59, 130, 246, 0.2)",
          inputBg: "rgba(255, 255, 255, 0.9)",
          shadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.98)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          botBg: "rgba(59, 130, 246, 0.2)",
          userBg: "rgba(59, 130, 246, 0.3)",
          inputBg: "rgba(55, 65, 81, 0.9)",
          shadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.98)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          botBg: "rgba(59, 130, 246, 0.2)",
          userBg: "rgba(59, 130, 246, 0.3)",
          inputBg: "rgba(30, 41, 59, 0.9)",
          shadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171"
        };
      default:
        return {
          background: "rgba(255, 255, 255, 0.98)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          botBg: "rgba(59, 130, 246, 0.1)",
          userBg: "rgba(59, 130, 246, 0.2)",
          inputBg: "rgba(255, 255, 255, 0.9)",
          shadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444"
        };
    }
  };

  const colors = getThemeColors();

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time motor data analysis
  const analyzeMotorData = (motorId) => {
    const motor = motors ? motors.find(m => m.id === motorId) : null;
    const liveData = liveMotorDataHistory && liveMotorDataHistory[motorId] ? liveMotorDataHistory[motorId] : null;
    
    if (!motor) return null;
    
    const latestData = liveData && liveData.length > 0 ? liveData[liveData.length - 1] : null;
    
    if (!latestData) {
      return {
        status: 'No Data',
        message: `No real-time data available for ${motor.name}. Please check MQTT connection.`,
        color: colors.warningColor
      };
    }
    
    const { temperature, vibration, confidence } = latestData;
    
    // Real analysis based on actual sensor data
    let status = 'Healthy';
    let color = colors.successColor;
    let issues = [];
    
    if (temperature > 40) {
      status = 'Critical';
      color = colors.dangerColor;
      issues.push('High temperature detected');
    } else if (temperature > 30) {
      status = 'Warning';
      color = colors.warningColor;
      issues.push('Elevated temperature');
    }
    
    if (vibration > 8) {
      status = 'Critical';
      color = colors.dangerColor;
      issues.push('Excessive vibration');
    } else if (vibration > 5) {
      if (status !== 'Critical') status = 'Warning';
      if (color !== colors.dangerColor) color = colors.warningColor;
      issues.push('High vibration levels');
    }
    
    return {
      status,
      color,
      issues,
      data: latestData,
      motor
    };
  };

  // Enhanced AI Response Generator with real data
  const generateAIResponse = async (userMessage) => {
    setIsTyping(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const lowerMessage = userMessage.toLowerCase();
    let response = "";
    let data = null;
    let action = null;

    // Enhanced greeting and casual conversation
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      const greetings = [
        "Hello! I'm your SEP Monitoring AI Assistant. How can I help you today? I'm here to assist with motor monitoring, technical questions, or just general conversation.",
        "Hi there! I'm ready to help with your motor monitoring system or any other questions you might have. What's on your mind?",
        "Hey! I'm your AI assistant for the SEP monitoring dashboard. I can help with technical analysis, general questions, or just chat. What would you like to know?"
      ];
      response = greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // How are you / wellbeing responses
    else if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you do')) {
      response = "I'm functioning perfectly, thank you for asking! I'm here and ready to assist you with motor monitoring, technical analysis, or any other questions you might have. How can I help you today?";
    }
    
    // Thank you responses
    else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      response = "You're very welcome! I'm here to help. Is there anything else you'd like to know about the motor monitoring system or any other topic?";
    }
    
    // Motor and system specific responses (project-focused)
    else if (lowerMessage.includes('motor') && lowerMessage.includes('status')) {
      if (!motors || motors.length === 0) {
        response = "I don't see any motors currently registered in the system. To get started with motor monitoring, you'll need to add motors through the Dashboard first. Would you like me to guide you through that process?";
      } else {
        response = "Let me check the real-time status of all your motors for you:\n\n";
        motors.forEach(motor => {
          const analysis = analyzeMotorData(motor.id);
          if (analysis) {
            const icon = analysis.status === 'Healthy' ? '🟢' : 
                        analysis.status === 'Warning' ? '🟡' : '🔴';
            response += `${icon} **${motor.name}** (${motor.id})\n`;
            response += `   Status: ${analysis.status}\n`;
            if (analysis.data) {
              response += `   Temperature: ${analysis.data.temperature}°C\n`;
              response += `   Vibration: ${analysis.data.vibration} m/s²\n`;
              response += `   Confidence: ${analysis.data.confidence}%\n`;
            }
            if (analysis.issues.length > 0) {
              response += `   Issues: ${analysis.issues.join(', ')}\n`;
            }
            response += '\n';
          }
        });
        response += "Is there anything specific about any of these motors you'd like me to analyze further?";
      }
    } 
    // Real-time data analysis
    else if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
      const motorData = liveMotorDataHistory && Object.values(liveMotorDataHistory).flat ? Object.values(liveMotorDataHistory).flat() : [];
      if (motorData && motorData.length > 0) {
        const avgTemp = motorData.reduce((sum, data) => sum + data.temperature, 0) / motorData.length;
        const maxTemp = Math.max(...motorData.map(data => data.temperature));
        const minTemp = Math.min(...motorData.map(data => data.temperature));
        
        response = `I've analyzed the temperature data from your motor sensors. Here's what I found:\n\n`;
        response += `📊 **Average Temperature**: ${avgTemp.toFixed(1)}°C\n`;
        response += `🔥 **Highest Reading**: ${maxTemp.toFixed(1)}°C\n`;
        response += `❄️ **Lowest Reading**: ${minTemp.toFixed(1)}°C\n\n`;
        
        if (maxTemp > 40) {
          response += `⚠️ **Attention Required**: I've detected temperatures exceeding the 40°C threshold. This could indicate potential issues with cooling systems or excessive load. I'd recommend investigating this further.\n`;
        } else if (maxTemp > 30) {
          response += `🟡 **Monitor Closely**: Temperatures are above normal operating range. While not critical, it's worth keeping an eye on these readings.\n`;
        } else {
          response += `✅ **All Good**: Temperature readings are within normal operating parameters. Your motors appear to be running at healthy temperatures.\n`;
        }
        
        response += `\nWould you like me to provide more detailed analysis or help you investigate any specific temperature patterns?`;
        
        data = { type: 'temperature', values: motorData.map(d => d.temperature) };
      } else {
        response = "I'm not seeing any real-time temperature data at the moment. This could be due to sensor connection issues or the motors not being actively monitored. Would you like me to help you troubleshoot the MQTT sensor connections?";
      }
    }
    // Vibration analysis
    else if (lowerMessage.includes('vibration') || lowerMessage.includes('vib')) {
      const motorData = liveMotorDataHistory && Object.values(liveMotorDataHistory).flat ? Object.values(liveMotorDataHistory).flat() : [];
      if (motorData && motorData.length > 0) {
        const avgVib = motorData.reduce((sum, data) => sum + data.vibration, 0) / motorData.length;
        const maxVib = Math.max(...motorData.map(data => data.vibration));
        const minVib = Math.min(...motorData.map(data => data.vibration));
        
        response = `I've examined the vibration data from your motor sensors. Here's my analysis:\n\n`;
        response += `📊 **Average Vibration**: ${avgVib.toFixed(2)} m/s²\n`;
        response += `📈 **Peak Vibration**: ${maxVib.toFixed(2)} m/s²\n`;
        response += `📉 **Minimum Vibration**: ${minVib.toFixed(2)} m/s²\n\n`;
        
        if (maxVib > 8) {
          response += `🔴 **Immediate Action Required**: Vibration levels have exceeded the 8 m/s² threshold. This could indicate bearing wear, misalignment, or other mechanical issues. I strongly recommend investigating this as soon as possible.\n`;
        } else if (maxVib > 5) {
          response += `🟡 **Caution**: Vibration levels are above normal operating range. While not immediately critical, this suggests potential mechanical issues that should be monitored closely.\n`;
        } else {
          response += `✅ **Excellent**: Vibration levels are well within normal operating parameters. Your motors appear to be running smoothly with minimal mechanical stress.\n`;
        }
        
        response += `\nWould you like me to help you investigate the cause of any elevated vibration levels or provide maintenance recommendations?`;
        
        data = { type: 'vibration', values: motorData.map(d => d.vibration) };
      } else {
        response = "I'm not detecting any vibration data currently. This might be due to sensor connectivity issues or the monitoring system not being active. Should I help you check the sensor connections or system status?";
      }
    }
    // System overview
    else if (lowerMessage.includes('overview') || lowerMessage.includes('summary')) {
      const totalMotors = motors ? motors.length : 0;
      const activeData = liveMotorDataHistory && Object.keys ? Object.keys(liveMotorDataHistory).length : 0;
      const motorData = liveMotorDataHistory && Object.values(liveMotorDataHistory).flat ? Object.values(liveMotorDataHistory).flat() : [];
      
      response = `Let me give you a comprehensive overview of your SEP monitoring system:\n\n`;
      response += `🏭 **Total Motors**: ${totalMotors}\n`;
      response += `📡 **Active Sensors**: ${activeData}\n`;
      response += `📊 **Data Points**: ${motorData.length}\n\n`;
      
      if (motorData && motorData.length > 0) {
        const avgConfidence = motorData.reduce((sum, data) => sum + data.confidence, 0) / motorData.length;
        response += `🎯 **Average AI Confidence**: ${avgConfidence.toFixed(1)}%\n`;
        
        const healthyMotors = motors ? motors.filter(motor => {
          const analysis = analyzeMotorData(motor.id);
          return analysis && analysis.status === 'Healthy';
        }).length : 0;
        
        response += `✅ **Healthy Motors**: ${healthyMotors}/${totalMotors}\n`;
        
        if (healthyMotors === totalMotors) {
          response += `\n🎉 **Excellent news!** All your motors are currently operating within healthy parameters.`;
        } else if (healthyMotors > 0) {
          response += `\n⚠️ **Attention**: ${totalMotors - healthyMotors} motor(s) may need attention. Would you like me to provide detailed analysis of any specific motors?`;
        } else {
          response += `\n🔴 **Critical**: All motors are showing issues. I'd recommend immediate investigation.`;
        }
      } else {
        response += `\n📝 **Note**: No real-time data is currently available. This could be normal if the system is just starting up or if there are connectivity issues.`;
      }
      
      data = { type: 'overview', motors: motors.length, activeData, totalDataPoints: motorData.length };
    }
    
    // General professional and technical responses (versatile like ChatGPT/Gemini)
    else if (lowerMessage.includes('induction motor') || lowerMessage.includes('electric motor')) {
      response = `⚡ **Induction Motor Information**\n\n**How it works:**\n• AC current creates rotating magnetic field\n• Induces current in rotor (hence "induction")\n• Rotor follows stator field, creating rotation\n\n**Key Components:**\n• Stator: Stationary windings\n• Rotor: Rotating conductor bars\n• Bearings: Support rotation\n• Cooling system: Prevents overheating\n\n**Common Issues:**\n• Bearing wear → vibration\n• Insulation failure → temperature rise\n• Voltage imbalance → efficiency loss\n\n**Maintenance:**\n• Regular vibration monitoring\n• Temperature tracking\n• Bearing lubrication\n• Insulation testing`;
    }
    
    else if (lowerMessage.includes('vibration') || lowerMessage.includes('bearing')) {
      response = `📊 **Vibration & Bearing Analysis**\n\n**Vibration Sources:**\n• Bearing wear/failure\n• Rotor imbalance\n• Misalignment\n• Loose components\n\n**Measurement Units:**\n• mm/s (velocity) - most common\n• g (acceleration) - high frequency\n• μm (displacement) - low frequency\n\n**Acceptable Levels:**\n• < 0.5 mm/s: Excellent\n• 0.5-1.0 mm/s: Good\n• 1.0-2.0 mm/s: Fair\n• > 2.0 mm/s: Poor\n\n**Bearing Failure Stages:**\n1. Initial wear (subtle vibration)\n2. Defect development (increasing levels)\n3. Advanced failure (high vibration + noise)\n4. Catastrophic failure (severe damage)`;
    }
    
    else if (lowerMessage.includes('temperature') || lowerMessage.includes('thermal')) {
      response = `🌡️ **Temperature Analysis**\n\n**Heat Sources in Motors:**\n• Copper losses (I²R)\n• Iron losses (hysteresis, eddy currents)\n• Friction losses (bearings)\n• Stray losses\n\n**Temperature Limits:**\n• Class A: 105°C (insulation)\n• Class B: 130°C\n• Class F: 155°C\n• Class H: 180°C\n\n**Monitoring Points:**\n• Winding temperature\n• Bearing temperature\n• Ambient temperature\n• Cooling medium temperature\n\n**Cooling Methods:**\n• Air cooling (TEFC, ODP)\n• Water cooling\n• Forced ventilation\n• Heat exchangers`;
    }
    
    else if (lowerMessage.includes('mqtt') || lowerMessage.includes('protocol')) {
      response = `📡 **MQTT Protocol**\n\n**What is MQTT:**\n• Message Queuing Telemetry Transport\n• Lightweight publish/subscribe protocol\n• Ideal for IoT and sensor networks\n\n**Key Features:**\n• Low bandwidth usage\n• Reliable message delivery\n• Quality of Service levels\n• Last Will and Testament\n\n**Topics Structure:**\n• Hierarchical (e.g., motors/motor1/temperature)\n• Wildcards supported (+ and #)\n• Flexible routing\n\n**QoS Levels:**\n• 0: At most once (fire and forget)\n• 1: At least once (acknowledged)\n• 2: Exactly once (assured delivery)\n\n**Benefits for Motor Monitoring:**\n• Real-time data transmission\n• Scalable architecture\n• Low latency\n• Energy efficient`;
    }
    
    else if (lowerMessage.includes('predictive maintenance') || lowerMessage.includes('condition monitoring')) {
      response = `🔮 **Predictive Maintenance**\n\n**Definition:**\n• Proactive maintenance based on condition\n• Prevents unexpected failures\n• Optimizes maintenance schedules\n\n**Key Technologies:**\n• Vibration analysis\n• Thermal imaging\n• Oil analysis\n• Acoustic monitoring\n• Current signature analysis\n\n**Benefits:**\n• Reduced downtime\n• Lower maintenance costs\n• Extended equipment life\n• Improved safety\n\n**Implementation Steps:**\n1. Data collection (sensors)\n2. Data transmission (MQTT/WiFi)\n3. Data analysis (AI/ML)\n4. Alert generation\n5. Maintenance scheduling`;
    }
    
    else if (lowerMessage.includes('machine learning') || lowerMessage.includes('ai') || lowerMessage.includes('neural network')) {
      response = `🤖 **Machine Learning in Industry**\n\n**Applications:**\n• Fault prediction\n• Anomaly detection\n• Performance optimization\n• Quality control\n\n**Common Algorithms:**\n• Random Forest: Classification\n• CNN: Image/pattern recognition\n• LSTM: Time series prediction\n• SVM: Pattern classification\n\n**Data Requirements:**\n• Historical failure data\n• Operating conditions\n• Sensor readings\n• Maintenance records\n\n**Implementation:**\n• Data preprocessing\n• Feature engineering\n• Model training\n• Validation/testing\n• Deployment/monitoring`;
    }
    
    else if (lowerMessage.includes('industrial automation') || lowerMessage.includes('industry 4.0')) {
      response = `🏭 **Industrial Automation & Industry 4.0**\n\n**Industry 4.0 Pillars:**\n• Cyber-physical systems\n• IoT connectivity\n• Cloud computing\n• AI/ML integration\n\n**Key Technologies:**\n• PLCs and SCADA\n• Industrial IoT (IIoT)\n• Digital twins\n• Edge computing\n• 5G networks\n\n**Benefits:**\n• Increased efficiency\n• Reduced costs\n• Improved quality\n• Enhanced safety\n• Predictive capabilities\n\n**Challenges:**\n• Cybersecurity\n• Data integration\n• Skill requirements\n• Investment costs`;
    }
    
    else if (lowerMessage.includes('sensor') || lowerMessage.includes('transducer')) {
      response = `📡 **Industrial Sensors**\n\n**Common Types:**\n• **Temperature:** RTD, Thermocouple, Thermistor\n• **Vibration:** Accelerometer, Velocity sensor\n• **Pressure:** Strain gauge, Piezoelectric\n• **Current:** CT, Hall effect sensor\n• **Speed:** Tachometer, Encoder\n\n**Selection Criteria:**\n• Measurement range\n• Accuracy requirements\n• Environmental conditions\n• Output signal type\n• Installation requirements\n\n**Signal Conditioning:**\n• Amplification\n• Filtering\n• Linearization\n• Calibration\n\n**Communication:**\n• 4-20mA (analog)\n• Modbus RTU/TCP\n• Profibus/Profinet\n• Wireless protocols`;
    }
    
    else if (lowerMessage.includes('data analysis') || lowerMessage.includes('analytics')) {
      response = `📊 **Data Analytics in Industry**\n\n**Types of Analysis:**\n• **Descriptive:** What happened?\n• **Diagnostic:** Why did it happen?\n• **Predictive:** What will happen?\n• **Prescriptive:** What should we do?\n\n**Key Metrics:**\n• OEE (Overall Equipment Effectiveness)\n• MTBF (Mean Time Between Failures)\n• MTTR (Mean Time To Repair)\n• Availability\n• Performance\n• Quality\n\n**Tools & Techniques:**\n• Statistical analysis\n• Time series analysis\n• Pattern recognition\n• Correlation analysis\n• Trend analysis\n\n**Visualization:**\n• Real-time dashboards\n• Trend charts\n• Heat maps\n• 3D plots`;
    }
    
    else if (lowerMessage.includes('energy efficiency') || lowerMessage.includes('power consumption')) {
      response = `⚡ **Energy Efficiency**\n\n**Motor Efficiency Factors:**\n• Load factor (optimal at 75-85%)\n• Power factor\n• Voltage balance\n• Temperature\n• Maintenance condition\n\n**Energy Savings Strategies:**\n• Variable speed drives (VSD)\n• High-efficiency motors (IE3/IE4)\n• Proper sizing\n• Regular maintenance\n• Power factor correction\n\n**Monitoring Parameters:**\n• Current consumption\n• Power factor\n• Efficiency\n• Operating hours\n• Load variations\n\n**Calculations:**\n• Energy consumption = Power × Time\n• Efficiency = Output power / Input power\n• Cost savings = (Old consumption - New consumption) × Rate`;
    }
    
    else if (lowerMessage.includes('safety') || lowerMessage.includes('risk')) {
      response = `🛡️ **Industrial Safety**\n\n**Electrical Safety:**\n• Lockout/Tagout (LOTO)\n• Arc flash protection\n• Ground fault protection\n• Insulation testing\n\n**Mechanical Safety:**\n• Guarding requirements\n• Emergency stops\n• Safety interlocks\n• Risk assessments\n\n**Monitoring Safety:**\n• Temperature limits\n• Vibration thresholds\n• Pressure limits\n• Speed monitoring\n\n**Standards:**\n• IEC 61508 (Functional safety)\n• ISO 13849 (Machine safety)\n• NFPA 70E (Electrical safety)\n• OSHA requirements`;
    }
    
    else if (lowerMessage.includes('calibration') || lowerMessage.includes('accuracy')) {
      response = `🎯 **Calibration & Accuracy**\n\n**Calibration Process:**\n• Compare to reference standard\n• Document uncertainties\n• Establish traceability\n• Regular intervals\n\n**Accuracy Classes:**\n• Class 0.1: ±0.1% (laboratory)\n• Class 0.5: ±0.5% (industrial)\n• Class 1.0: ±1.0% (general)\n• Class 2.0: ±2.0% (rough)\n\n**Factors Affecting Accuracy:**\n• Temperature effects\n• Aging\n• Environmental conditions\n• Installation errors\n• Signal interference\n\n**Calibration Intervals:**\n• Based on usage\n• Environmental conditions\n• Criticality of measurement\n• Historical drift data`;
    }
    
    // Help and guidance
    else if (lowerMessage.includes('help') || lowerMessage.includes('guide')) {
      response = `I'm here to help you with a wide range of topics! Here's what I can assist you with:\n\n`;
      response += `🤖 **Motor Monitoring (My Specialty):**\n`;
      response += `• Real-time motor status and health analysis\n`;
      response += `• Temperature and vibration monitoring\n`;
      response += `• System overview and performance insights\n`;
      response += `• Troubleshooting and maintenance guidance\n\n`;
      response += `💡 **Technical & Professional Topics:**\n`;
      response += `• Industrial automation and Industry 4.0\n`;
      response += `• Machine learning and AI applications\n`;
      response += `• Engineering principles and best practices\n`;
      response += `• General technical questions\n\n`;
      response += `💬 **General Conversation:**\n`;
      response += `• Casual chat and questions\n`;
      response += `• Professional advice\n`;
      response += `• Problem-solving discussions\n\n`;
      response += `🎤 **Voice Input**: Click the microphone button to speak!\n\n`;
      response += `Just ask me anything - I'm here to help!`;
    }
    
    // General conversation and non-technical topics
    else if (lowerMessage.includes('weather') || lowerMessage.includes('temperature outside')) {
      response = "I can help you with motor temperature monitoring, but I don't have access to real-time weather data. However, I can tell you that environmental temperature can significantly affect motor performance and cooling efficiency. Would you like me to explain how ambient temperature impacts motor operation?";
    }
    
    else if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
      const now = new Date();
      response = `The current time is ${now.toLocaleTimeString()} and today is ${now.toLocaleDateString()}. Is there anything specific about motor monitoring or other topics I can help you with?`;
    }
    
    else if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) {
      response = "I'm more focused on being helpful than funny, but I can tell you this: Why did the motor go to therapy? Because it had too many issues with its bearings! 😄 Seriously though, I'm here to help with motor monitoring, technical questions, or any other topics you'd like to discuss.";
    }
    
    else if (lowerMessage.includes('name') || lowerMessage.includes('who are you')) {
      response = "I'm your SEP Monitoring AI Assistant! I'm here to help you with motor monitoring, technical analysis, and general questions. I can assist with real-time data analysis, troubleshooting, and provide insights about your motor systems. What would you like to know?";
    }
    
    else if (lowerMessage.includes('goodbye') || lowerMessage.includes('bye') || lowerMessage.includes('see you')) {
      response = "Goodbye! I'll be here when you need help with motor monitoring, technical questions, or anything else. Feel free to come back anytime!";
    }
    
    // Default versatile response
    else {
      response = `I'm your SEP Monitoring AI Assistant, and I'm here to help with a wide range of topics!\n\n`;
      response += `**I can assist you with:**\n`;
      response += `• **Motor Monitoring**: Real-time analysis, status checks, troubleshooting\n`;
      response += `• **Technical Topics**: Industrial automation, engineering principles, best practices\n`;
      response += `• **General Questions**: Professional advice, problem-solving, casual conversation\n`;
      response += `• **Data Analysis**: Temperature, vibration, performance insights\n\n`;
      response += `**Just ask me anything!** Whether it's about your motors, technical questions, or general topics, I'm here to provide helpful, professional assistance. What would you like to know?`;
    }

    setIsTyping(false);
    return { response, data, action };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      data: null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    const aiResult = await generateAIResponse(inputMessage);
    
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: aiResult.response,
      timestamp: new Date(),
      data: aiResult.data,
      action: aiResult.action
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use text input.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        alert('Unable to start voice input. Please try again or use text input.');
        setIsListening(false);
      }
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderDataVisualization = (data) => {
    if (!data || !data.values) return null;

    if (data.type === 'temperature' || data.type === 'vibration') {
      const values = data.values && data.values.length > 0 ? data.values.slice(-10) : []; // Last 10 readings
      if (values.length === 0) return null;
      
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      return (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
            📊 {data.type === 'temperature' ? 'Temperature' : 'Vibration'} Trend
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '40px' }}>
            {values.map((value, index) => {
              const height = ((value - min) / (max - min)) * 100 || 10;
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    background: colors.accentColor,
                    borderRadius: '2px',
                    minHeight: '4px'
                  }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: '11px', color: colors.textColor, opacity: 0.7, marginTop: '4px' }}>
            Range: {min.toFixed(1)} - {max.toFixed(1)} {data.type === 'temperature' ? '°C' : 'm/s²'}
          </div>
        </div>
      );
    }

    if (data.type === 'overview') {
      return (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
            📈 System Statistics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
            <div>Motors: <strong>{data.motors}</strong></div>
            <div>Active: <strong>{data.activeData}</strong></div>
            <div>Data Points: <strong>{data.totalDataPoints}</strong></div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accentColor}, ${colors.accentColor}dd)`,
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: colors.shadow,
          transition: 'all 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = `0 15px 35px ${colors.accentColor}40`;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = colors.shadow;
        }}
      >
        {isOpen ? <FaTimes /> : <FaRobot />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '450px',
          height: '600px',
          background: colors.background,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '20px',
          boxShadow: colors.shadow,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: `linear-gradient(135deg, ${colors.accentColor}10, ${colors.accentColor}05)`
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.accentColor}, ${colors.accentColor}dd)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              boxShadow: `0 4px 12px ${colors.accentColor}40`
            }}>
              <FaRobot />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: colors.textColor }}>
                SEP AI Assistant
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textColor, opacity: 0.7 }}>
                {isTyping ? 'Analyzing data...' : 'Real-time monitoring active'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '16px 20px',
                  borderRadius: message.type === 'user' ? '20px 20px 8px 20px' : '20px 20px 20px 8px',
                  background: message.type === 'user' ? colors.userBg : colors.botBg,
                  color: colors.textColor,
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {message.content}
                  {renderDataVisualization(message.data)}
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '8px',
                    textAlign: message.type === 'user' ? 'right' : 'left'
                  }}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '20px 20px 20px 8px',
                  background: colors.botBg,
                  color: colors.textColor,
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.accentColor,
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.accentColor,
                      animation: 'pulse 1.5s infinite 0.2s'
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.accentColor,
                      animation: 'pulse 1.5s infinite 0.4s'
                    }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '20px',
            borderTop: `1px solid ${colors.borderColor}`,
            background: `linear-gradient(135deg, ${colors.accentColor}05, ${colors.accentColor}02)`
          }}>
            {/* Quick Suggestions */}
            {messages.length <= 2 && (
              <div style={{
                marginBottom: '12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(suggestion)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: `1px solid ${colors.borderColor}`,
                      background: colors.inputBg,
                      color: colors.textColor,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = colors.accentColor;
                      e.target.style.color = 'white';
                      e.target.style.borderColor = colors.accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = colors.inputBg;
                      e.target.style.color = colors.textColor;
                      e.target.style.borderColor = colors.borderColor;
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about motor status, temperature, vibration, or system overview..."
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    maxHeight: '120px',
                    padding: '12px 16px',
                    borderRadius: '22px',
                    border: `2px solid ${colors.borderColor}`,
                    background: colors.inputBg,
                    color: colors.textColor,
                    fontSize: '14px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accentColor;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.accentColor}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.borderColor;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <button
                onClick={toggleVoiceInput}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isListening ? colors.dangerColor : `rgba(59, 130, 246, 0.1)`,
                  color: isListening ? 'white' : colors.accentColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  fontSize: '16px'
                }}
                title={isListening ? 'Stop listening' : 'Voice input'}
                onMouseEnter={(e) => {
                  if (!isListening) {
                    e.target.style.background = `rgba(59, 130, 246, 0.2)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isListening) {
                    e.target.style.background = `rgba(59, 130, 246, 0.1)`;
                  }
                }}
              >
                {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: 'none',
                  background: inputMessage.trim() ? `linear-gradient(135deg, ${colors.accentColor}, ${colors.accentColor}dd)` : 'rgba(59, 130, 246, 0.1)',
                  color: inputMessage.trim() ? 'white' : colors.accentColor,
                  cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim()) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputMessage.trim()) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}
      </style>
    </div>
  );
};

export default AIChatbot; 