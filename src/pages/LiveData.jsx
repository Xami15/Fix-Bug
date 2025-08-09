// src/pages/LiveData.jsx
import React, { useEffect, useState, useContext } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";

import { useMotors } from "../context/MotorsContext";
import { ThemeContext } from "../context/ThemeContext";
import { FaThermometerHalf, FaWaveSquare, FaWifi, FaTimes, FaClock, FaChartLine, FaCog, FaChevronDown } from 'react-icons/fa';
import UnitConverter from "../utils/unitConverter";
import "./LiveData.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

export default function LiveData() {
  const { motors, liveMotorDataHistory, mqttConnected } = useMotors();
  const { theme } = useContext(ThemeContext);
  const [selectedMotorId, setSelectedMotorId] = useState("");
  const [displayPreferences, setDisplayPreferences] = useState({
    temperatureUnit: 'C',
    vibrationUnit: 'm/s²'
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getThemeColors = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: '#1a1a1a',
          cardBg: '#2d2d2d',
          text: '#ffffff',
          textSecondary: '#b0b0b0',
          border: '#404040',
          hover: '#3a3a3a'
        };
      case 'blue':
        return {
          bg: '#0f172a',
          cardBg: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#94a3b8',
          border: '#334155',
          hover: '#334155'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          cardBg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          text: '#1e293b',
          textSecondary: '#475569',
          border: '#cbd5e1',
          hover: '#e2e8f0'
        };
    }
  };

  const colors = getThemeColors();

  // Effect to set initial selected motor or adjust if motors change
  useEffect(() => {
    if (motors.length > 0) {
      if (!selectedMotorId || !motors.some(m => m.id === selectedMotorId)) {
        setSelectedMotorId(motors[0].id);
      }
    } else {
      setSelectedMotorId("");
    }
  }, [motors, selectedMotorId]);

  // Effect to load display preferences from localStorage and listen for changes
  useEffect(() => {
    const savedPreferences = localStorage.getItem('displayPreferences');
    if (savedPreferences) {
      setDisplayPreferences(JSON.parse(savedPreferences));
    }

    // Listen for unit change events from Settings page
    const handleUnitChangeEvent = (event) => {
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

    window.addEventListener('unitChanged', handleUnitChangeEvent);
    return () => window.removeEventListener('unitChanged', handleUnitChangeEvent);
  }, []);

  // Get current motor's direct data from the 'motors' array (updated by MQTT)
  const currentMotor = motors.find(m => m.id === selectedMotorId);

  // Convert motor data for display based on preferences
  const convertedMotorData = currentMotor ? UnitConverter.convertForDisplay(currentMotor, displayPreferences) : null;

  // Get historical data for the chart from liveMotorDataHistory
  const dataForCharts = liveMotorDataHistory[selectedMotorId] || {
    temperature: [],
    vibration: [],
    timestamps: [],
  };

  const MAX_CHART_POINTS = 60; // Should match MAX_HISTORY_POINTS in MotorsContext for consistency

  const getChartDataPoints = (dataArray, fillValue) => {
    const slicedData = dataArray.slice(-MAX_CHART_POINTS);
    return [...Array(Math.max(0, MAX_CHART_POINTS - slicedData.length)).fill(fillValue), ...slicedData];
  };

  // Determine if the motor is effectively "disconnected" for display (card AND chart)
  // This means no valid numeric data has arrived yet for its current status.
  const isMotorEffectivelyDisconnected = currentMotor?.status === 'Disconnected' ||
                                        currentMotor?.temperature === null ||
                                        currentMotor?.vibration === null ||
                                        typeof currentMotor?.temperature !== 'number' ||
                                        typeof currentMotor?.vibration !== 'number';

  // Values for the info card display - only show real data
  const displayedTemperature = isMotorEffectivelyDisconnected ? null : (convertedMotorData?.temperature ?? null);
  const displayedVibration = isMotorEffectivelyDisconnected ? null : (convertedMotorData?.vibration ?? null);

  const paddedTemperatures = isMotorEffectivelyDisconnected
    ? getChartDataPoints(dataForCharts.temperature, null)
    : getChartDataPoints(dataForCharts.temperature, null);

  const paddedVibrations = isMotorEffectivelyDisconnected
    ? getChartDataPoints(dataForCharts.vibration, null)
    : getChartDataPoints(dataForCharts.vibration, null);

  const paddedTimestamps = getChartDataPoints(dataForCharts.timestamps, null);

  // Calculate simple moving average for trend analysis
  const calculateMovingAverage = (data, period) => {
    if (data.length < period) return data;
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + (b || 0), 0);
        result.push(sum / period);
      }
    }
    return result;
  };

  const tempMA = calculateMovingAverage(paddedTemperatures, 5);
  const vibMA = calculateMovingAverage(paddedVibrations, 5);

  const chartData = {
    labels: paddedTimestamps.map(timestamp => {
      if (!timestamp) return '';
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp:', timestamp);
          return '';
        }
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        });
      } catch (error) {
        console.error('Error parsing timestamp:', timestamp, error);
        return '';
      }
    }),
    datasets: [
      {
        label: `Temperature (${displayPreferences.temperatureUnit})`,
        data: paddedTemperatures,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        fill: true,
        spanGaps: true,
        tension: 0.3,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
      },
      {
        label: `Vibration (${displayPreferences.vibrationUnit})`,
        data: paddedVibrations,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        fill: true,
        spanGaps: true,
        tension: 0.3,
        pointHoverBackgroundColor: '#ef4444',
        pointHoverBorderColor: '#ffffff',
      },
      {
        label: `Temperature Trend`,
        data: tempMA,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        spanGaps: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
      {
        label: `Vibration Trend`,
        data: vibMA,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        spanGaps: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
      onProgress: function(animation) {
        const chart = animation.chart;
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        
        // Add subtle gradient overlay
        if (chartArea) {
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.02)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          color: colors.text,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '600',
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          },
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, index) => ({
              text: dataset.label,
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.borderColor,
              lineWidth: dataset.borderWidth,
              lineDash: dataset.borderDash || [],
              pointStyle: index < 2 ? 'circle' : 'line',
              hidden: false,
              index: index
            }));
          }
        },
        onClick: function(e, legendItem, legend) {
          const index = legendItem.index;
          const ci = legend.chart;
          const meta = ci.getDatasetMeta(index);
          
          // Toggle visibility
          meta.hidden = !meta.hidden;
          ci.update();
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12,
          weight: '500'
        },
        callbacks: {
          title: function(context) {
            return `🕐 ${context[0].label}`;
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (value === null || value === undefined) {
              return `${label}: No data`;
            }
            
            // Add icons and better formatting
            let icon = '📊';
            if (label.includes('Temperature')) icon = '🌡️';
            if (label.includes('Vibration')) icon = '📳';
            if (label.includes('Trend')) icon = '📈';
            
            return `${icon} ${label}: ${value.toFixed(2)}`;
          },
          afterBody: function(context) {
            // Add summary information
            const tempData = context.filter(c => c.dataset.label.includes('Temperature') && !c.dataset.label.includes('Trend'));
            const vibData = context.filter(c => c.dataset.label.includes('Vibration') && !c.dataset.label.includes('Trend'));
            
            if (tempData.length > 0 && vibData.length > 0) {
              const temp = tempData[0].parsed.y;
              const vib = vibData[0].parsed.y;
              
              let status = '✅ Normal';
              if (temp > 80 || vib > 10) status = '⚠️ Warning';
              if (temp > 100 || vib > 15) status = '🚨 Critical';
              
              return [``, `Status: ${status}`];
            }
            return [];
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time (Last 60 Readings)',
          color: colors.textSecondary,
          font: {
            size: 12,
            weight: '600',
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          },
          padding: { top: 8 }
        },
        ticks: {
          color: colors.textSecondary,
          maxTicksLimit: 8,
          font: {
            size: 10,
            weight: '500'
          },
          padding: 4,
          callback: function(value, index, values) {
            // Show time labels more clearly
            const label = this.getLabelForValue(value);
            if (index === 0 || index === values.length - 1 || index % 15 === 0) {
              return label;
            }
            return '';
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
          lineWidth: 1,
          drawBorder: false,
          drawOnChartArea: true,
          drawTicks: false,
        },
        border: {
          color: colors.border,
          width: 1,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
          color: colors.textSecondary,
          font: {
            size: 12,
            weight: '600',
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          },
          padding: { bottom: 8 }
        },
        ticks: {
          color: colors.textSecondary,
          font: {
            size: 10,
            weight: '500'
          },
          padding: 4,
          callback: function(value, index, values) {
            return value.toFixed(1);
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
          lineWidth: 1,
          drawBorder: false,
          drawOnChartArea: true,
          drawTicks: false,
        },
        border: {
          color: colors.border,
          width: 1,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      point: {
        hoverRadius: 6,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
      },
      line: {
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
    },
    plugins: {
      annotation: {
        annotations: {
          // Add threshold lines for better understanding
          tempThreshold: {
            type: 'line',
            yMin: 80,
            yMax: 80,
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              content: 'Temp Warning (80°C)',
              position: 'start',
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              color: '#ffffff',
              font: { size: 10, weight: '600' },
              padding: 4,
              borderRadius: 4
            }
          },
          vibThreshold: {
            type: 'line',
            yMin: 10,
            yMax: 10,
            borderColor: '#ef4444',
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              content: 'Vib Warning (10 m/s²)',
              position: 'start',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: '#ffffff',
              font: { size: 10, weight: '600' },
              padding: 4,
              borderRadius: 4
            }
          }
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy':
      case 'Running':
        return '#28a745';
      case 'Warning':
        return '#ffc107';
      case 'Fault':
      case 'FAULT':
        return '#dc3545';
      case 'Stopped':
        return '#6c757d';
      case 'Disconnected':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="live-data-page" style={{ background: colors.bg, minHeight: '100vh', padding: '20px' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        padding: '20px 0'
      }}>
        <div>
          <h1 style={{ 
            color: colors.text, 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FaChartLine style={{ color: '#3b82f6', fontSize: '24px' }} />
            Live Data Monitoring
          </h1>
          <p style={{ 
            color: colors.textSecondary, 
            margin: '0', 
            fontSize: '14px'
          }}>
            Real-time motor performance tracking and analysis
          </p>
        </div>

        {/* Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '20px',
          background: mqttConnected ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
          color: mqttConnected ? '#22c55e' : '#ef4444',
          fontSize: '13px',
          fontWeight: '500',
          border: `1px solid ${mqttConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: mqttConnected ? '#22c55e' : '#ef4444',
            animation: mqttConnected ? 'pulse 2s infinite' : 'none'
          }} />
          {mqttConnected ? 'Live' : 'Offline'}
        </div>
      </div>

             {/* Top Row - Motor Selection and Live Metrics */}
       <div style={{ 
         display: 'flex', 
         justifyContent: 'center',
         marginBottom: '20px',
         marginLeft: '40px',
         marginRight: '40px'
       }}>
        
                 {/* Left Panel - Motor Selection */}
         <div style={{ 
           background: colors.cardBg, 
           border: `1px solid ${colors.border}`,
           borderRadius: '12px',
           padding: '12px',
           display: 'flex',
           flexDirection: 'column',
           height: 'fit-content',
           width: '280px',
           marginTop: '60px',
           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
           backdropFilter: 'blur(10px)'
         }}>
          <h3 style={{ 
            color: colors.text, 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FaCog style={{ fontSize: '11px', color: '#3b82f6' }} />
            Select Motor
          </h3>
          
          {/* Motor Selection Dropdown */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '240px',
                padding: '8px 10px',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                background: colors.cardBg,
                color: colors.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => e.target.style.borderColor = '#3b82f6'}
              onMouseLeave={(e) => e.target.style.borderColor = colors.border}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCog style={{ fontSize: '11px', color: '#3b82f6' }} />
                <span style={{ fontWeight: '500' }}>
                  {selectedMotorId 
                    ? currentMotor?.name || 'Unknown'
                    : 'Choose motor...'
                  }
                </span>
              </div>
              <FaChevronDown style={{ 
                fontSize: '9px', 
                color: colors.textSecondary,
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} />
            </div>

            {/* Dropdown Options - Fixed positioning */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '240px',
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '150px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {motors.map((motor) => (
                  <div
                    key={motor.id}
                    onClick={() => {
                      setSelectedMotorId(motor.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.hover}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaCog style={{ fontSize: '9px', color: '#3b82f6' }} />
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>
                        {motor.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: colors.textSecondary }}>
                      {motor.id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Motor Info */}
          {selectedMotorId && currentMotor && (
            <div style={{
              padding: '8px',
              backgroundColor: `${colors.border}10`,
              borderRadius: '6px',
              border: `1px solid ${colors.border}20`
            }}>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: colors.text,
                  marginBottom: '2px'
                }}>
                  {currentMotor.name}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: colors.textSecondary 
                }}>
                  ID: {currentMotor.id}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(currentMotor.status)
                }} />
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '500',
                  color: getStatusColor(currentMotor.status)
                }}>
                  {currentMotor.status}
                </span>
              </div>
            </div>
          )}
        </div>

                 {/* Right Panel - Live Metrics */}
         <div style={{ 
           background: colors.cardBg, 
           border: `1px solid ${colors.border}`,
           borderRadius: '12px',
           padding: '12px',
           height: 'fit-content',
           width: '280px',
           marginLeft: '40px',
           marginTop: '60px',
           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
           backdropFilter: 'blur(10px)'
         }}>
          <h3 style={{ 
            color: colors.text, 
            margin: '0 0 12px 0', 
            fontSize: '13px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FaThermometerHalf style={{ fontSize: '11px', color: '#fd7e14' }} />
            Live Metrics
          </h3>

          {selectedMotorId && currentMotor ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Selected Motor Info */}
              <div style={{
                padding: '8px',
                background: `linear-gradient(135deg, ${colors.border}15 0%, ${colors.border}8 100%)`,
                borderRadius: '6px',
                border: `1px solid ${colors.border}30`,
                marginBottom: '2px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    color: colors.text,
                    marginBottom: '1px'
                  }}>
                    {currentMotor.name}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: colors.textSecondary 
                  }}>
                    ID: {currentMotor.id}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(currentMotor.status)
                  }} />
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '600',
                    color: getStatusColor(currentMotor.status),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {currentMotor.status}
                  </span>
                </div>
              </div>

              {/* Temperature Card */}
              <div style={{
                padding: '8px',
                background: `linear-gradient(135deg, ${colors.border}12 0%, ${colors.border}6 100%)`,
                borderRadius: '6px',
                border: `1px solid ${colors.border}25`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaThermometerHalf style={{ fontSize: '12px', color: '#fd7e14' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>
                      Temperature
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '500'
                  }}>
                    °{displayPreferences.temperatureUnit}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: colors.text,
                  letterSpacing: '-0.5px'
                }}>
                  {displayedTemperature !== null ? UnitConverter.formatTemperature(displayedTemperature, displayPreferences.temperatureUnit) : '--'}
                </div>
              </div>

              {/* Vibration Card */}
              <div style={{
                padding: '8px',
                background: `linear-gradient(135deg, ${colors.border}12 0%, ${colors.border}6 100%)`,
                borderRadius: '6px',
                border: `1px solid ${colors.border}25`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaWaveSquare style={{ fontSize: '12px', color: '#6f42c1' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>
                      Vibration
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    fontWeight: '500'
                  }}>
                    {displayPreferences.vibrationUnit}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: colors.text,
                  letterSpacing: '-0.5px'
                }}>
                  {displayedVibration !== null ? UnitConverter.formatVibration(displayedVibration, displayPreferences.vibrationUnit) : '--'}
                </div>
              </div>

              {/* Status Card */}
              <div style={{
                padding: '8px',
                background: `linear-gradient(135deg, ${colors.border}12 0%, ${colors.border}6 100%)`,
                borderRadius: '6px',
                border: `1px solid ${colors.border}25`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock style={{ fontSize: '12px', color: '#17a2b8' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>
                      Last Update
                    </span>
                  </div>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: colors.text
                }}>
                  {currentMotor.lastUpdated 
                    ? new Date(currentMotor.lastUpdated).toLocaleTimeString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 12px',
              color: colors.textSecondary,
              fontSize: '12px',
              textAlign: 'center'
            }}>
              <div>
                <FaCog style={{ fontSize: '16px', marginBottom: '6px', opacity: 0.5 }} />
                <p>Select a motor to view metrics</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row - Big Chart */}
      <div style={{ 
        background: colors.cardBg, 
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '28px',
        height: 'calc(100vh - 320px)',
        minHeight: '450px',
        marginLeft: '40px',
        marginRight: '40px',
        boxShadow: theme === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)' 
          : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '@media (max-width: 768px)': {
          marginLeft: '20px',
          marginRight: '20px',
          padding: '20px',
          borderRadius: '12px'
        }
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme === 'dark' 
            ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.03) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.02) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '28px',
          gap: '24px',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{ 
              color: colors.text, 
              margin: '0 0 12px 0', 
              fontSize: '20px', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '16px',
                flexShrink: 0
              }}>
                📊
              </div>
              Real-time Performance Chart
            </h3>
            <p style={{ 
              color: colors.textSecondary, 
              margin: '0 0 16px 0', 
              fontSize: '14px',
              lineHeight: '1.5',
              maxWidth: '600px'
            }}>
              Monitor temperature and vibration trends in real-time with intelligent trend analysis. 
              The dashed trend lines show 5-period moving averages to help identify patterns and predict potential issues.
            </p>
            
            {/* Enhanced Chart Guide */}
            <div style={{
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              padding: '16px',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                }}></div>
                <span>Temperature</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}></div>
                <span>Vibration</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}>
                <div style={{
                  width: '16px',
                  height: '2px',
                  backgroundColor: '#10b981',
                  borderTop: '2px dashed #10b981'
                }}></div>
                <span>Temp Trend</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: colors.text,
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}>
                <div style={{
                  width: '16px',
                  height: '2px',
                  backgroundColor: '#f59e0b',
                  borderTop: '2px dashed #f59e0b'
                }}></div>
                <span>Vib Trend</span>
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
            minWidth: '140px',
            flexShrink: 0
          }}>
            <div style={{ 
              fontSize: '13px',
              color: '#ffffff',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '24px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              ':hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)'
              }
            }}>
              <div style={{ fontSize: '14px' }}>⚡</div>
              Live Data
            </div>
            <div style={{ 
              fontSize: '12px',
              color: colors.textSecondary,
              textAlign: 'center',
              padding: '6px 12px',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
            }}>
              📈 Last 60 readings
            </div>
          </div>
        </div>
        
        <div style={{ 
          height: 'calc(100% - 160px)',
          position: 'relative',
          zIndex: 1,
          minHeight: '300px'
        }}>
          {selectedMotorId ? (
            <div style={{
              position: 'relative',
              height: '100%',
              transition: 'all 0.3s ease'
            }}>
              <Line data={chartData} options={options} />
              
              {/* Chart Overlay for better UX */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                opacity: 0.8,
                transition: 'opacity 0.2s ease',
                cursor: 'pointer',
                ':hover': {
                  opacity: 1
                }
              }}>
                💡 Hover for details
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: colors.textSecondary,
              fontSize: '16px',
              textAlign: 'center',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: '12px',
              border: `2px dashed ${colors.border}`,
              transition: 'all 0.3s ease'
            }}>
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  color: '#ffffff',
                  fontSize: '28px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}>
                  📊
                </div>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Select a motor to view real-time data</p>
                <p style={{ fontSize: '14px', opacity: 0.7 }}>Choose from the dropdown above to start monitoring</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance Summary Panel */}
        {selectedMotorId && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: '12px',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {/* Temperature Analysis */}
            <div style={{
              padding: '16px',
              background: theme === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px'
                }}>
                  🌡️
                </div>
                <div>
                  <h4 style={{
                    color: colors.text,
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Temperature Analysis
                  </h4>
                  <p style={{
                    color: colors.textSecondary,
                    margin: '0',
                    fontSize: '12px'
                  }}>
                    Current: {displayedTemperature?.toFixed(1) || 'N/A'} {displayPreferences.temperatureUnit}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                <span style={{ color: colors.textSecondary }}>Trend:</span>
                <span style={{
                  color: tempMA.length > 1 && tempMA[tempMA.length - 1] > tempMA[tempMA.length - 2] ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {tempMA.length > 1 && tempMA[tempMA.length - 1] > tempMA[tempMA.length - 2] ? '↗️ Rising' : '↘️ Falling'}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '8px'
              }}>
                <span style={{ color: colors.textSecondary }}>Status:</span>
                <span style={{
                  color: displayedTemperature > 80 ? '#f59e0b' : '#10b981',
                  fontWeight: '600'
                }}>
                  {displayedTemperature > 100 ? '🚨 Critical' : displayedTemperature > 80 ? '⚠️ Warning' : '✅ Normal'}
                </span>
              </div>
            </div>

            {/* Vibration Analysis */}
            <div style={{
              padding: '16px',
              background: theme === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px'
                }}>
                  📳
                </div>
                <div>
                  <h4 style={{
                    color: colors.text,
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Vibration Analysis
                  </h4>
                  <p style={{
                    color: colors.textSecondary,
                    margin: '0',
                    fontSize: '12px'
                  }}>
                    Current: {displayedVibration?.toFixed(2) || 'N/A'} {displayPreferences.vibrationUnit}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                <span style={{ color: colors.textSecondary }}>Trend:</span>
                <span style={{
                  color: vibMA.length > 1 && vibMA[vibMA.length - 1] > vibMA[vibMA.length - 2] ? '#10b981' : '#ef4444',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {vibMA.length > 1 && vibMA[vibMA.length - 1] > vibMA[vibMA.length - 2] ? '↗️ Rising' : '↘️ Falling'}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '8px'
              }}>
                <span style={{ color: colors.textSecondary }}>Status:</span>
                <span style={{
                  color: displayedVibration > 10 ? '#f59e0b' : '#10b981',
                  fontWeight: '600'
                }}>
                  {displayedVibration > 15 ? '🚨 Critical' : displayedVibration > 10 ? '⚠️ Warning' : '✅ Normal'}
                </span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div style={{
              padding: '16px',
              background: theme === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px'
                }}>
                  📈
                </div>
                <div>
                  <h4 style={{
                    color: colors.text,
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Performance Metrics
                  </h4>
                  <p style={{
                    color: colors.textSecondary,
                    margin: '0',
                    fontSize: '12px'
                  }}>
                    Data Points: {dataForCharts.timestamps.length}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                <span style={{ color: colors.textSecondary }}>Update Rate:</span>
                <span style={{
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  ⚡ Real-time
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '8px'
              }}>
                <span style={{ color: colors.textSecondary }}>Connection:</span>
                <span style={{
                  color: mqttConnected ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {mqttConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
              </div>
            </div>

            {/* Motor Status */}
            <div style={{
              padding: '16px',
              background: theme === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)'}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px'
                }}>
                  ⚙️
                </div>
                <div>
                  <h4 style={{
                    color: colors.text,
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Motor Status
                  </h4>
                  <p style={{
                    color: colors.textSecondary,
                    margin: '0',
                    fontSize: '12px'
                  }}>
                    {currentMotor?.name || 'Unknown Motor'}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                <span style={{ color: colors.textSecondary }}>Status:</span>
                <span style={{
                  color: getStatusColor(currentMotor?.status),
                  fontWeight: '600'
                }}>
                  {currentMotor?.status || 'Unknown'}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '8px'
              }}>
                <span style={{ color: colors.textSecondary }}>ID:</span>
                <span style={{
                  color: colors.text,
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  {selectedMotorId}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
