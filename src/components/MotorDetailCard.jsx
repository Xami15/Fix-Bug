// src/components/MotorDetailCard.jsx
import React from 'react';
import './MotorDetailCard.css';
// REMOVED: import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// REMOVED: import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

export default function MotorDetailCard({ motor, onDelete }) {
  // Correctly destructuring properties directly from the 'motor' prop
  const { id, name, location, temperature, vibration, status, lastUpdated } = motor;

  // Intelligent status detection based on sensor values
  const getIntelligentStatus = () => {
    // If motor is disconnected/offline
    if (!status || status === 'DISCONNECTED' || status === 'Offline' || status === 'Disconnected') {
      return 'disconnected';
    }

    // Check if we have valid sensor data
    if (temperature === null || temperature === undefined || 
        vibration === null || vibration === undefined) {
      return 'disconnected';
    }

    // Define thresholds for different status levels (adjusted for ESP32 sensor readings)
    const TEMP_NORMAL_MIN = 15; // °C - Normal operating temperature minimum
    const TEMP_NORMAL_MAX = 32; // °C - Normal operating temperature maximum
    const TEMP_WARNING_MIN = 10; // °C - Warning level minimum
    const TEMP_WARNING_MAX = 36; // °C - Warning level maximum
    const VIB_NORMAL_MAX = 1.5;  // m/s² - Normal vibration
    const VIB_WARNING_MAX = 2.5; // m/s² - Warning level

    // Check for critical conditions (red) - temperature outside warning range
    if (temperature < TEMP_WARNING_MIN || temperature > TEMP_WARNING_MAX || vibration > VIB_WARNING_MAX) {
      return 'fault';
    }

    // Check for warning conditions (yellow) - temperature outside normal range but within warning range
    if (temperature < TEMP_NORMAL_MIN || temperature > TEMP_NORMAL_MAX || vibration > VIB_NORMAL_MAX) {
      return 'warning';
    }

    // Normal conditions (green)
    return 'normal';
  };

  const getStatusClass = (currentStatus) => {
    // Use intelligent status detection for online motors
    if (currentStatus && currentStatus !== 'DISCONNECTED' && currentStatus !== 'Offline' && currentStatus !== 'Disconnected') {
      return getIntelligentStatus();
    }

    // For disconnected motors, use the original status logic
    switch (currentStatus) {
      case 'NORMAL': return 'normal';
      case 'WARNING': return 'warning';
      case 'FAULT': return 'fault';
      case 'DISCONNECTED': return 'disconnected';
      case 'Disconnected': return 'disconnected';
      case 'Healthy': return 'normal';
      case 'Warning': return 'warning';
      case 'Fault': return 'fault';
      case 'Unknown': return 'disconnected';
      default: return 'disconnected';
    }
  };

  // Get status text for display
  const getStatusText = () => {
    const statusClass = getStatusClass(status);
    switch (statusClass) {
      case 'normal': return 'Normal';
      case 'warning': return 'Warning';
      case 'fault': return 'Critical';
      case 'disconnected': return 'Offline';
      default: return status || 'Unknown';
    }
  };

  // Get status description with thresholds
  const getStatusDescription = () => {
    const statusClass = getStatusClass(status);
    switch (statusClass) {
      case 'normal': return 'All values within normal range';
      case 'warning': return 'Values approaching critical levels';
      case 'fault': return 'Critical values detected';
      case 'disconnected': return 'Motor offline or no data';
      default: return '';
    }
  };

  // Ensure lastUpdated is a Date object for formatting, handle null/non-Date
  const formattedLastUpdated = lastUpdated instanceof Date
    ? lastUpdated.toLocaleString()
    : 'N/A'; // If lastUpdated is null or not a Date

  return (
    <div className={`motor-detail-card status-${getStatusClass(status)}`} title={getStatusDescription()}>
      <div className="card-header">
        <h3 className="motor-name">{name}</h3>
        <button onClick={() => onDelete(id)} className="delete-motor-btn" title="Delete Motor">
          {/* Replaced FontAwesomeIcon with a simple X */}
          X
        </button>
      </div>
      <div className="card-body">
        <p><strong>Location:</strong> {location}</p>
        {/* Display actual temperature and vibration values */}
        <p><strong>Temp:</strong> {temperature !== null && temperature !== undefined && status !== 'Disconnected' ? `${temperature.toFixed(1)} °C` : 'N/A'}</p>
        <p><strong>Vib:</strong> {vibration !== null && vibration !== undefined && status !== 'Disconnected' ? `${vibration.toFixed(3)} m/s²` : 'N/A'}</p>
        <div className="motor-status">
          <span className={`status-dot ${getStatusClass(status)}`}></span>
          <span>{getStatusText()}</span>
        </div>
      </div>
      <div className="last-updated">
        Updated: {formattedLastUpdated}
      </div>
    </div>
  );
}
