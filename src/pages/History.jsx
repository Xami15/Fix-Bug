// src/pages/History.jsx
import React, { useState, useMemo, useContext, useEffect } from "react";
import { useMotors } from "../context/MotorsContext";
import { ThemeContext } from "../context/ThemeContext";
import { FaFilter, FaDownload, FaChartLine, FaClock, FaThermometerHalf, FaWaveSquare } from 'react-icons/fa';
import UnitConverter from '../utils/unitConverter';
import './History.css';

const statusColors = {
  Healthy: "#28a745",
  Warning: "#ffc107",
  Fault: "#dc3545",
  Initialized: "#6c757d",
  Disconnected: "#6c757d",
  Running: "#17a2b8",
  Stopped: "#6c757d",
};

const History = () => {
  const { historyData = [], motors = [], mqttConnected } = useMotors();
  const { theme } = useContext(ThemeContext);
  const [displayPreferences, setDisplayPreferences] = useState(() => {
    const saved = localStorage.getItem("displayPreferences");
    return saved ? JSON.parse(saved) : {
      temperatureUnit: "C",
      vibrationUnit: "m/s²"
    };
  });

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    motor: "All",
    status: "All",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  const validMotorIds = useMemo(() => motors.map((m) => m.id), [motors]);
  const motorOptions = useMemo(() => ["All", ...validMotorIds], [validMotorIds]);

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

  const filteredData = useMemo(() => {
    return historyData.filter((log) => {
      if (!validMotorIds.includes(log.motor)) return false;

      const logDate = new Date(log.timestamp);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      if (filters.motor !== "All" && log.motor !== filters.motor) return false;
      
      // Use intelligent status detection for filtering
      if (filters.status !== "All") {
        const getIntelligentStatus = (log) => {
          if (log.temperature === null || log.temperature === undefined || 
              log.vibration === null || log.vibration === undefined) {
            return 'Disconnected';
          }

          const TEMP_NORMAL_MIN = 15; // °C - Normal operating temperature minimum
          const TEMP_NORMAL_MAX = 32; // °C - Normal operating temperature maximum
          const TEMP_WARNING_MIN = 10; // °C - Warning level minimum
          const TEMP_WARNING_MAX = 36; // °C - Warning level maximum
          const VIB_NORMAL_MAX = 1.5;  // m/s² - Normal vibration
          const VIB_WARNING_MAX = 2.5; // m/s² - Warning level

          // Check for critical conditions (red) - temperature outside warning range
          if (log.temperature < TEMP_WARNING_MIN || log.temperature > TEMP_WARNING_MAX || log.vibration > VIB_WARNING_MAX) {
            return 'Critical';
          }

          // Check for warning conditions (yellow) - temperature outside normal range but within warning range
          if (log.temperature < TEMP_NORMAL_MIN || log.temperature > TEMP_NORMAL_MAX || log.vibration > VIB_NORMAL_MAX) {
            return 'Warning';
          }

          return 'Normal';
        };

        const intelligentStatus = getIntelligentStatus(log);
        if (intelligentStatus !== filters.status) return false;
      }

      return true;
    });
  }, [filters, historyData, validMotorIds]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "timestamp") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const summaryStats = useMemo(() => {
    const totalRecords = sortedData.length;
    
    // Use intelligent status detection for counting
    const getIntelligentStatus = (log) => {
      // Check if we have valid sensor data
      if (log.temperature === null || log.temperature === undefined || 
          log.vibration === null || log.vibration === undefined) {
        return 'disconnected';
      }

      // Define thresholds for different status levels
      const TEMP_NORMAL_MIN = 15; // °C - Normal operating temperature minimum
      const TEMP_NORMAL_MAX = 32; // °C - Normal operating temperature maximum
      const TEMP_WARNING_MIN = 10; // °C - Warning level minimum
      const TEMP_WARNING_MAX = 36; // °C - Warning level maximum
      const VIB_NORMAL_MAX = 1.5;  // m/s² - Normal vibration
      const VIB_WARNING_MAX = 2.5; // m/s² - Warning level

      // Check for critical conditions (red) - temperature outside warning range
      if (log.temperature < TEMP_WARNING_MIN || log.temperature > TEMP_WARNING_MAX || log.vibration > VIB_WARNING_MAX) {
        return 'fault';
      }

      // Check for warning conditions (yellow) - temperature outside normal range but within warning range
      if (log.temperature < TEMP_NORMAL_MIN || log.temperature > TEMP_NORMAL_MAX || log.vibration > VIB_NORMAL_MAX) {
        return 'warning';
      }

      // Normal conditions (green)
      return 'normal';
    };

    let healthyCount = 0;
    let warningCount = 0;
    let faultCount = 0;

    sortedData.forEach(log => {
      const status = getIntelligentStatus(log);
      switch (status) {
        case 'normal':
          healthyCount += 1;
          break;
        case 'warning':
          warningCount += 1;
          break;
        case 'fault':
          faultCount += 1;
          break;
        default:
          // For disconnected or unknown, don't count in healthy/warning/fault
          break;
      }
    });

    return {
      totalRecords,
      healthyCount,
      warningCount,
      faultCount
    };
  }, [sortedData]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      motor: "All",
      status: "All",
    });
    setCurrentPage(1);
  };

    const exportData = () => {
    // Export in format compatible with Prediction page CSV analysis
    const csvContent = [
      ['motor_id', 'temperature', 'vibration', 'timestamp', 'status'],
      ...sortedData.map(log => {
        // Use motor ID instead of name for compatibility
        const motorId = log.motor;
        
        // Export raw sensor values (not formatted) for AI analysis
        const temperature = log.temperature !== null && log.temperature !== undefined ? log.temperature : '';
        const vibration = log.vibration !== null && log.vibration !== undefined ? log.vibration : '';
        
        // Format timestamp as ISO string for consistency
        const timestamp = new Date(log.timestamp).toISOString();
        
        // Get intelligent status for the log entry
        const getIntelligentStatus = (log) => {
          if (log.temperature === null || log.temperature === undefined || 
              log.vibration === null || log.vibration === undefined) {
            return 'disconnected';
          }

          const TEMP_NORMAL_MIN = 15; // °C - Normal operating temperature minimum
          const TEMP_NORMAL_MAX = 32; // °C - Normal operating temperature maximum
          const TEMP_WARNING_MIN = 10; // °C - Warning level minimum
          const TEMP_WARNING_MAX = 36; // °C - Warning level maximum
          const VIB_NORMAL_MAX = 1.5;  // m/s² - Normal vibration
          const VIB_WARNING_MAX = 2.5; // m/s² - Warning level

          // Check for critical conditions (red) - temperature outside warning range
          if (log.temperature < TEMP_WARNING_MIN || log.temperature > TEMP_WARNING_MAX || log.vibration > VIB_WARNING_MAX) {
            return 'critical';
          }

          // Check for warning conditions (yellow) - temperature outside normal range but within warning range
          if (log.temperature < TEMP_NORMAL_MIN || log.temperature > TEMP_NORMAL_MAX || log.vibration > VIB_NORMAL_MAX) {
            return 'warning';
          }

          return 'normal';
        };
        
        const status = getIntelligentStatus(log);
        
        return [
          motorId,
          temperature,
          vibration,
          timestamp,
          status
        ];
      })
         ].map(row => row.map(cell => {
       // Handle empty values and ensure proper CSV formatting
       if (cell === null || cell === undefined || cell === '') {
         return '""';
       }
       // Escape quotes in the cell value
       const escapedCell = String(cell).replace(/"/g, '""');
       return `"${escapedCell}"`;
     }).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `motor_history_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="history-container" style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="history-header" style={{ 
        backgroundColor: colors.cardBg, 
        borderBottom: `1px solid ${colors.border}`,
        padding: '24px',
        marginBottom: '24px',
        borderRadius: '12px'
      }}>
        <div className="header-content">
          <div className="header-title-section">
            <h1 style={{ color: colors.text, margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
              <FaChartLine style={{ marginRight: '12px' }} />
              Motor History
            </h1>
            <p style={{ color: colors.textSecondary, margin: '0', fontSize: '16px' }}>
              Historical data and performance analysis
            </p>
          </div>
          
          <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                backgroundColor: colors.cardBg,
                color: colors.text,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <FaFilter />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <button
              onClick={exportData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
                             <FaDownload />
               Export for AI Analysis
            </button>
          </div>
        </div>
      </div>

      {/* MQTT Connection Status */}
      <div className="connection-status" style={{
        margin: '0 24px 24px',
        padding: '12px 24px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: '500',
        fontSize: '14px',
        backgroundColor: mqttConnected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
        color: mqttConnected ? '#28a745' : '#dc3545'
      }}>
        {mqttConnected ? '🟢' : '🔴'} {mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}
      </div>

      {/* Summary Cards */}
      <div className="history-summary-cards" style={{ padding: '0 24px 24px' }}>
        <div className="summary-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="summary-card" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            transition: 'all 0.2s ease'
          }}>
            <div className="summary-card-icon" style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '20px',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              color: '#007bff'
            }}>
              <FaChartLine />
            </div>
            <div className="summary-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: colors.textSecondary }}>
                Total Records
              </h3>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: '0', color: colors.text }}>
                {summaryStats.totalRecords}
              </p>
            </div>
          </div>

          <div className="summary-card" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            transition: 'all 0.2s ease'
          }}>
            <div className="summary-card-icon" style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '20px',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              color: '#28a745'
            }}>
              ✅
            </div>
            <div className="summary-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: colors.textSecondary }}>
                Healthy
              </h3>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: '0', color: colors.text }}>
                {summaryStats.healthyCount}
              </p>
            </div>
          </div>

          <div className="summary-card" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            transition: 'all 0.2s ease'
          }}>
            <div className="summary-card-icon" style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '20px',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              color: '#ffc107'
            }}>
              ⚠️
            </div>
            <div className="summary-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: colors.textSecondary }}>
                Warning
              </h3>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: '0', color: colors.text }}>
                {summaryStats.warningCount}
              </p>
            </div>
          </div>

          <div className="summary-card" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            transition: 'all 0.2s ease'
          }}>
            <div className="summary-card-icon" style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '20px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              color: '#dc3545'
            }}>
              🚨
            </div>
            <div className="summary-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: colors.textSecondary }}>
                Fault
              </h3>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: '0', color: colors.text }}>
                {summaryStats.faultCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="history-filter-section" style={{
          margin: '0 24px 24px',
          padding: '24px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.cardBg
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: colors.text }}>
            Filter Options
          </h3>
          <div className="filter-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div className="filter-group">
              <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', color: colors.text }}>
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.cardBg,
                  color: colors.text
                }}
              />
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', color: colors.text }}>
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.cardBg,
                  color: colors.text
                }}
              />
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', color: colors.text }}>
                Motor
              </label>
              <select
                name="motor"
                value={filters.motor}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.cardBg,
                  color: colors.text
                }}
              >
                {motorOptions.map((motor) => (
                  <option key={motor} value={motor}>
                    {motor}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block', color: colors.text }}>
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: colors.cardBg,
                  color: colors.text
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Normal">Normal</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
                <option value="Disconnected">Disconnected</option>
              </select>
            </div>
          </div>

          <button
            onClick={clearFilters}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              marginTop: '16px'
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="history-table-container" style={{ padding: '0 24px 24px' }}>
        <div className="history-table-wrapper" style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.cardBg,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead className="history-table-header" style={{ backgroundColor: colors.hover }}>
              <tr>
                <th
                  onClick={() => handleSort("motor")}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.text,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  Motor
                </th>
                <th
                  onClick={() => handleSort("status")}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.text,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  Status
                </th>
                <th
                  onClick={() => handleSort("temperature")}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.text,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  Temperature ({displayPreferences.temperatureUnit})
                </th>
                <th
                  onClick={() => handleSort("vibration")}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.text,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  Vibration ({displayPreferences.vibrationUnit})
                </th>
                <th
                  onClick={() => handleSort("timestamp")}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.text,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((log, index) => (
                <tr
                  key={index}
                  className="history-table-row"
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background-color 0.2s ease'
                  }}
                >
                                     <td style={{ padding: '16px', color: colors.text }}>
                     {(() => {
                       const motor = motors.find(m => m.id === log.motor);
                       return motor ? motor.name : log.motor;
                     })()}
                   </td>
                  <td style={{ padding: '16px' }}>
                    {(() => {
                      // Use intelligent status detection for display
                      const getIntelligentStatus = (log) => {
                        if (log.temperature === null || log.temperature === undefined || 
                            log.vibration === null || log.vibration === undefined) {
                          return { status: 'Disconnected', color: '#6c757d' };
                        }

                        const TEMP_NORMAL_MAX = 35;
                        const TEMP_WARNING_MAX = 45;
                        const VIB_NORMAL_MAX = 2.0;
                        const VIB_WARNING_MAX = 3.5;

                        if (log.temperature > TEMP_WARNING_MAX || log.vibration > VIB_WARNING_MAX) {
                          return { status: 'Critical', color: '#dc3545' };
                        }

                        if (log.temperature > TEMP_NORMAL_MAX || log.vibration > VIB_NORMAL_MAX) {
                          return { status: 'Warning', color: '#ffc107' };
                        }

                        return { status: 'Normal', color: '#28a745' };
                      };

                      const intelligentStatus = getIntelligentStatus(log);
                      
                      return (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: `${intelligentStatus.color}20`,
                            color: intelligentStatus.color
                          }}
                        >
                          {intelligentStatus.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '16px', color: colors.text }}>
                    {UnitConverter.formatTemperature(log.temperature, displayPreferences.temperatureUnit)}
                  </td>
                  <td style={{ padding: '16px', color: colors.text }}>
                    {UnitConverter.formatVibration(log.vibration, displayPreferences.vibrationUnit)}
                  </td>
                  <td style={{ padding: '16px', color: colors.text }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="history-pagination" style={{
          padding: '24px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            First
          </button>
          
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>

          <span className="history-pagination-info" style={{
            color: colors.textSecondary,
            padding: '0 16px',
            fontWeight: '500'
          }}>
            Page {currentPage} of {totalPages} ({summaryStats.totalRecords} records)
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next
          </button>
          
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default History;
