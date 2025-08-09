// src/pages/Prediction.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useMotors } from '../context/MotorsContext';
import { ThemeContext } from '../context/ThemeContext';
import aiPredictionService from '../services/aiPredictionService';
import { 
  FaBrain, 
  FaChartLine, 
  FaUpload, 
  FaDownload, 
  FaPlay, 
  FaPause, 
  FaCog, 
  FaThermometerHalf, 
  FaWaveSquare, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaFileCsv,
  FaRobot,
  FaLightbulb,
  FaChartBar,
  FaHistory,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import UnitConverter from '../utils/unitConverter';
import './Prediction.css';

export default function Prediction() {
  const { motors, liveMotorDataHistory } = useMotors();
  const { theme } = useContext(ThemeContext);
  const fileInputRef = useRef(null);

  // State management
  const [analysisMode, setAnalysisMode] = useState('realtime'); // 'realtime' or 'csv'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [selectedMotor, setSelectedMotor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [predictionConfidence, setPredictionConfidence] = useState({});
  const [aiInsights, setAiInsights] = useState([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [backendStatus, setBackendStatus] = useState('unknown');
  
  // State for display preferences
  const [displayPreferences, setDisplayPreferences] = useState(() => {
    const saved = localStorage.getItem("displayPreferences");
    return saved ? JSON.parse(saved) : {
      temperatureUnit: "C",
      vibrationUnit: "m/s²"
    };
  });

  // Effect to listen for unit changes
  useEffect(() => {
    const handleUnitChange = (event) => {
      const { type, unit } = event.detail;
      setDisplayPreferences(prev => {
        const updated = { ...prev };
        if (type === 'temperature') {
          updated.temperatureUnit = unit;
        } else if (type === 'vibration') {
          updated.vibrationUnit = unit;
        }
        return updated;
      });
    };

    window.addEventListener('unitChanged', handleUnitChange);
    return () => window.removeEventListener('unitChanged', handleUnitChange);
  }, []);

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.95) 100%)",
          cardBg: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)",
          borderColor: "rgba(203, 213, 225, 0.3)",
          textColor: "#1e293b",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.15)"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.95)",
          cardBg: "rgba(55, 65, 81, 0.8)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.95)",
          cardBg: "rgba(30, 41, 59, 0.8)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
        };
      default:
        return {
          background: "linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.95) 100%)",
          cardBg: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)",
          borderColor: "rgba(203, 213, 225, 0.3)",
          textColor: "#1e293b",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.15)"
        };
    }
  };

  const colors = getThemeColors();

  // AI-powered motor analysis using CNN model
  const analyzeMotorWithAI = async (motorData) => {
    setIsAnalyzing(true);
    
    try {
      // Prepare sensor data for ML analysis with proper units
      const sensorData = {
        temperature: motorData.temperature || 0,
        vibration: motorData.vibration || 0,
        acceleration_x: motorData.acceleration_x || 0,
        acceleration_y: motorData.acceleration_y || 0,
        acceleration_z: motorData.acceleration_z || 9.8,
        motor_id: motorData.id,
        timestamp: new Date().toISOString()
      };

      // Try to use the real AI service first
      const response = await aiPredictionService.predictRealtime([sensorData]);
      
      if (response.success && response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0];
        setIsAnalyzing(false);
        return {
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          health_status: prediction.health_status || 'Unknown',
          recommendations: prediction.recommendations || [],
          riskScore: prediction.risk_score || 0
        };
      } else {
        throw new Error('No prediction data received');
      }
    } catch (error) {
      console.warn('AI service unavailable, using simulation:', error);
      
      // Fallback to simulation with rule-based logic
      const temp = motorData.temperature || 0;
      const vib = motorData.vibration || 0;
      
      let prediction = 0;
      let confidence = 0.8;
      let health_status = 'Normal';
      let recommendations = [];
      
      if (temp > 80 || vib > 10) {
        prediction = 1;
        confidence = 0.9;
        health_status = 'Critical';
        recommendations = ['Immediate shutdown recommended', 'Contact maintenance team'];
      } else if (temp > 60 || vib > 5) {
        prediction = 0;
        confidence = 0.7;
        health_status = 'Warning';
        recommendations = ['Monitor closely', 'Schedule maintenance soon'];
      }
      
      setIsAnalyzing(false);
      return {
        prediction,
        confidence,
        health_status,
        recommendations,
        riskScore: prediction * confidence * 100
      };
    }
  };

  // Handle CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target.result;
        const lines = csvData.split('\n').filter(line => line.trim()); // Remove empty lines
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Normalize column names for better compatibility
        const normalizedHeaders = headers.map(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('temp')) return 'temperature';
          if (lowerHeader.includes('vib')) return 'vibration';
          if (lowerHeader.includes('curr')) return 'current';
          if (lowerHeader.includes('speed')) return 'speed';
          if (lowerHeader.includes('time') || lowerHeader.includes('date')) return 'timestamp';
          return header;
        });
        
        const data = lines.slice(1).map((line, index) => {
          // Improved CSV parsing to handle quoted values
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim()); // Add the last value
          
          const row = {};
          
          normalizedHeaders.forEach((header, i) => {
            let value = values[i];
            if (value && value !== '') {
              // Remove quotes if present
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              
              // Convert numeric values
              if (['temperature', 'vibration', 'current', 'speed'].includes(header)) {
                const numValue = parseFloat(value);
                row[header] = isNaN(numValue) ? value : numValue;
              } else {
                row[header] = value;
              }
            }
          });
          
          // Add motor ID if not present
          if (!row.motor_id && !row.id) {
            row.motor_id = `csv_motor_${index + 1}`;
          }
          
          return row;
        }).filter(row => {
          // Only include rows with at least temperature or vibration data
          return row.temperature !== undefined || row.vibration !== undefined;
        });
        
        console.log('Parsed CSV data:', { headers: normalizedHeaders, dataCount: data.length, sampleData: data.slice(0, 3) });
        console.log('First few rows of parsed data:', data.slice(0, 5));
        
        setUploadedData({ headers: normalizedHeaders, data });
        setAnalysisMode('csv');
      };
      reader.readAsText(file);
    }
  };

  // Analyze uploaded CSV data using AI
  const analyzeCSVData = async () => {
    if (!uploadedData) return;
    
    setIsAnalyzing(true);
    console.log('Starting CSV analysis with data:', uploadedData.data.slice(0, 3));
    console.log('Full uploaded data structure:', uploadedData);
    
    try {
      // Try to use the real AI service first
      console.log('Attempting to use real AI service...');
      const response = await aiPredictionService.analyzeCSV(uploadedData.data);
      
      console.log('AI service response:', response);
      
      if (response.success && response.results) {
        console.log('Setting analysis results:', response.results.slice(0, 3));
        setAnalysisResults(response.results);
      } else {
        throw new Error('No analysis results received');
      }
    } catch (error) {
      console.warn('AI service unavailable, using simulation:', error);
      
      // Fallback to simulation
      console.log('Using fallback simulation...');
      const response = await aiPredictionService.simulateCSVAnalysis(uploadedData.data);
      console.log('Simulation response:', response);
      setAnalysisResults(response.results);
    }
    
    setIsAnalyzing(false);
  };

  // Check backend status
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (error) {
        console.warn('Backend not available:', error);
        setBackendStatus('disconnected');
      }
    };
    
    checkBackendStatus();
  }, []);

  // Real-time motor analysis
  useEffect(() => {
    if (analysisMode === 'realtime' && isRealTimeActive && motors.length > 0) {
      const analyzeMotors = async () => {
        const results = [];
        for (const motor of motors) {
          // Get real-time data from MQTT
          const liveData = liveMotorDataHistory[motor.id];
          const latestData = liveData && liveData.length > 0 ? liveData[liveData.length - 1] : null;
          
          if (latestData) {
            // Use real MQTT data for analysis
            const motorWithRealData = {
              ...motor,
              temperature: latestData.temperature,
              vibration: latestData.vibration,
              current: latestData.current || 5,
              speed: latestData.speed || 1500
            };
            
            const analysis = await analyzeMotorWithAI(motorWithRealData);
            results.push({
              id: motor.id,
              name: motor.name,
              ...analysis
            });
          } else {
            // No real data available
            results.push({
              id: motor.id,
              name: motor.name,
              prediction: 'No Data',
              confidence: 0,
              insights: ['No real-time sensor data available'],
              riskScore: 0,
              model_type: 'No Data'
            });
          }
        }
        setAnalysisResults(results);
      };
      
      analyzeMotors();
      
      // Set up interval for continuous analysis
      const interval = setInterval(analyzeMotors, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [motors, analysisMode, isRealTimeActive, liveMotorDataHistory]);

  // Generate AI insights
  useEffect(() => {
    if (analysisResults.length > 0) {
      const insights = [];
      
      // Overall system health
      const healthyCount = analysisResults.filter(r => r.prediction === 'Healthy').length;
      const warningCount = analysisResults.filter(r => r.prediction === 'Warning').length;
      const faultCount = analysisResults.filter(r => r.prediction === 'Critical Fault').length;
      
      if (faultCount > 0) {
        insights.push({
          type: 'critical',
          message: `${faultCount} motor(s) require immediate attention`,
          icon: FaExclamationTriangle
        });
      }
      
      if (warningCount > 0) {
        insights.push({
          type: 'warning',
          message: `${warningCount} motor(s) showing warning signs`,
          icon: FaClock
        });
      }
      
      if (healthyCount === analysisResults.length) {
        insights.push({
          type: 'success',
          message: 'All motors operating optimally',
          icon: FaCheckCircle
        });
      }
      
      // Performance trends
      const avgConfidence = analysisResults.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.length;
      if (avgConfidence > 85) {
        insights.push({
          type: 'info',
          message: 'High confidence in predictions',
          icon: FaBrain
        });
      }
      
      setAiInsights(insights);
    }
  }, [analysisResults]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return colors.successColor;
      case 'Attention': return colors.accentColor;
      case 'Warning': return colors.warningColor;
      case 'Critical Fault': return colors.dangerColor;
      default: return colors.textColor;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'success': return colors.successColor;
      case 'warning': return colors.warningColor;
      case 'critical': return colors.dangerColor;
      case 'info': return colors.accentColor;
      default: return colors.textColor;
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: colors.background,
      minHeight: '100vh',
      color: colors.textColor
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
            AI-Powered Motor Analysis
          </h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.7 }}>
            CNN-based real-time prediction and historical analysis
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setAnalysisMode('realtime')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: analysisMode === 'realtime' ? colors.accentColor : 'rgba(59, 130, 246, 0.1)',
              color: analysisMode === 'realtime' ? 'white' : colors.accentColor,
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaChartLine />
            Real-time
          </button>
          
          <button
            onClick={() => setAnalysisMode('csv')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: analysisMode === 'csv' ? colors.accentColor : 'rgba(59, 130, 246, 0.1)',
              color: analysisMode === 'csv' ? 'white' : colors.accentColor,
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaFileCsv />
            CSV Analysis
          </button>
        </div>
      </div>

      {/* Mode-specific content */}
      {analysisMode === 'realtime' ? (
        <div>
          {/* Control Panel */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderColor}`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  Real-time CNN Analysis
                </h3>
                <p style={{ margin: '4px 0 0 0', opacity: 0.7 }}>
                  Live motor data processed through convolutional neural networks
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsRealTimeActive(!isRealTimeActive)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isRealTimeActive ? colors.successColor : colors.dangerColor,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isRealTimeActive ? <FaPause /> : <FaPlay />}
                  {isRealTimeActive ? 'Pause' : 'Start'}
                </button>
                
                {isAnalyzing && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: colors.accentColor
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: `2px solid ${colors.accentColor}`,
                      borderTop: '2px solid transparent',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Analyzing with Real AI...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <div style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${colors.borderColor}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaLightbulb />
                AI Insights
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: `rgba(${getInsightColor(insight.type) === colors.successColor ? '16, 185, 129' : 
                        getInsightColor(insight.type) === colors.warningColor ? '245, 158, 11' :
                        getInsightColor(insight.type) === colors.dangerColor ? '239, 68, 68' : '59, 130, 246'}, 0.1)`,
                      border: `1px solid ${getInsightColor(insight.type)}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <insight.icon style={{ color: getInsightColor(insight.type) }} />
                    {insight.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {analysisResults.map((result) => (
              <div
                key={result.id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '16px',
                  padding: '24px',
                  border: `1px solid ${colors.borderColor}`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedMotor(result)}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = colors.shadow;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                      {result.name}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.7, fontSize: '14px' }}>
                      Motor ID: {result.id}
                    </p>
                    {result.model_type && (
                      <div style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: result.model_type === 'CNN' ? 'rgba(59, 130, 246, 0.1)' : 
                                   result.model_type === 'Random Forest' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: result.model_type === 'CNN' ? colors.accentColor : 
                               result.model_type === 'Random Forest' ? colors.warningColor : colors.textColor,
                        border: `1px solid ${result.model_type === 'CNN' ? colors.accentColor : 
                                          result.model_type === 'Random Forest' ? colors.warningColor : colors.borderColor}`
                      }}>
                        🤖 {result.model_type}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `rgba(${getStatusColor(result.prediction) === colors.successColor ? '16, 185, 129' : 
                      getStatusColor(result.prediction) === colors.warningColor ? '245, 158, 11' :
                      getStatusColor(result.prediction) === colors.dangerColor ? '239, 68, 68' : '59, 130, 246'}, 0.1)`,
                    color: getStatusColor(result.prediction),
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {result.prediction}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaThermometerHalf style={{ color: colors.accentColor }} />
                    <span style={{ fontSize: '14px' }}>
                      {motors.find(m => m.id === result.id)?.temperature ? 
                        UnitConverter.formatTemperature(motors.find(m => m.id === result.id).temperature, displayPreferences.temperatureUnit) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaWaveSquare style={{ color: colors.accentColor }} />
                    <span style={{ fontSize: '14px' }}>
                      {motors.find(m => m.id === result.id)?.vibration ? 
                        UnitConverter.formatVibration(motors.find(m => m.id === result.id).vibration, displayPreferences.vibrationUnit) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>AI Confidence</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: colors.accentColor }}>
                      {result.confidence}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${result.confidence}%`,
                      height: '100%',
                      background: colors.accentColor,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {result.insights && result.insights.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '500', opacity: 0.7 }}>
                      AI Recommendations:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', opacity: 0.8 }}>
                      {result.insights.slice(0, 2).map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* CSV Upload Section */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: `1px solid ${colors.borderColor}`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                 Historical Data Analysis
               </h3>
               <div style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px',
                 padding: '4px 8px',
                 borderRadius: '12px',
                 fontSize: '12px',
                 fontWeight: '600',
                 background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 
                            backendStatus === 'disconnected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                 color: backendStatus === 'connected' ? colors.successColor : 
                        backendStatus === 'disconnected' ? colors.dangerColor : colors.warningColor,
                 border: `1px solid ${backendStatus === 'connected' ? colors.successColor : 
                                     backendStatus === 'disconnected' ? colors.dangerColor : colors.warningColor}`
               }}>
                 <div style={{
                   width: '6px',
                   height: '6px',
                   borderRadius: '50%',
                   background: backendStatus === 'connected' ? colors.successColor : 
                              backendStatus === 'disconnected' ? colors.dangerColor : colors.warningColor
                 }} />
                 {backendStatus === 'connected' ? 'AI Backend Connected' : 
                  backendStatus === 'disconnected' ? 'AI Backend Offline' : 'Checking Backend...'}
               </div>
             </div>
            
            {!uploadedData ? (
              <div style={{
                border: `2px dashed ${colors.borderColor}`,
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
              >
                <FaUpload style={{ fontSize: '48px', color: colors.accentColor, marginBottom: '16px' }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                  Upload CSV File
                </p>
                <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>
                  Drag and drop or click to upload motor data for analysis
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                     <div>
                     <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                       File uploaded: {uploadedData.data.length} records
                     </p>
                     <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                       Columns: {uploadedData.headers.join(', ')}
                     </p>
                     {uploadedData.data.length > 0 && (
                       <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                         <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '600' }}>Sample Data:</p>
                         <p style={{ margin: 0, fontSize: '10px', fontFamily: 'monospace' }}>
                           Temp: {uploadedData.data[0].temperature ? 
                             UnitConverter.formatTemperature(uploadedData.data[0].temperature, displayPreferences.temperatureUnit) : 'N/A'}, 
                           Vib: {uploadedData.data[0].vibration ? 
                             UnitConverter.formatVibration(uploadedData.data[0].vibration, displayPreferences.vibrationUnit) : 'N/A'}, 
                           Current: {uploadedData.data[0].current || 'N/A'}
                         </p>
                       </div>
                     )}
                   </div>
                  <button
                    onClick={analyzeCSVData}
                    disabled={isAnalyzing}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: colors.accentColor,
                      color: 'white',
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isAnalyzing ? 0.6 : 1
                    }}
                  >
                    <FaBrain />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Data'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CSV Analysis Results */}
          {analysisResults.length > 0 && (
            <div>
              <div style={{
                background: colors.cardBg,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                border: `1px solid ${colors.borderColor}`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Historical Analysis Results
                </h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.borderColor}` }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Timestamp</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Temperature</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Vibration</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Prediction</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResults.slice(0, 10).map((result) => (
                        <tr key={result.id} style={{ borderBottom: `1px solid ${colors.borderColor}` }}>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{result.timestamp}</td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {(result.features?.temperature || result.temperature) ? 
                              UnitConverter.formatTemperature(result.features?.temperature || result.temperature, displayPreferences.temperatureUnit) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {(result.features?.vibration || result.vibration) ? 
                              UnitConverter.formatVibration(result.features?.vibration || result.vibration, displayPreferences.vibrationUnit) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: `rgba(${getStatusColor(result.prediction) === colors.successColor ? '16, 185, 129' : 
                                getStatusColor(result.prediction) === colors.warningColor ? '245, 158, 11' :
                                getStatusColor(result.prediction) === colors.dangerColor ? '239, 68, 68' : '59, 130, 246'}, 0.1)`,
                              color: getStatusColor(result.prediction)
                            }}>
                              {result.prediction}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{result.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}