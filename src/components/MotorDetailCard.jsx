// src/components/MotorDetailCard.jsx
import React from 'react';
import './MotorDetailCard.css';
// REMOVED: import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// REMOVED: import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

export default function MotorDetailCard({ motor, onDelete }) {
  // Correctly destructuring properties directly from the 'motor' prop
  const { id, name, location, temperature, vibration, status, lastUpdated } = motor;

  const getStatusClass = (currentStatus) => {
    switch (currentStatus) {
      case 'NORMAL': return 'normal';
      case 'WARNING': return 'warning';
      case 'FAULT': return 'fault';
      case 'DISCONNECTED': return 'disconnected';
      case 'Healthy': return 'normal'; // Added for consistency with MQTT payloads
      case 'Warning': return 'warning'; // Added for consistency
      case 'Fault': return 'fault';     // Added for consistency
      case 'Unknown': return 'disconnected'; // Added for initial MQTT state
      default: return '';
    }
  };

  // Ensure lastUpdated is a Date object for formatting, handle null/non-Date
  const formattedLastUpdated = lastUpdated instanceof Date
    ? lastUpdated.toLocaleString()
    : 'N/A'; // If lastUpdated is null or not a Date

  return (
    <div className={`motor-detail-card status-${getStatusClass(status)}`}>
      <div className="card-header">
        <h3 className="motor-name">{name}</h3>
        <button onClick={() => onDelete(id)} className="delete-motor-btn" title="Delete Motor">
          {/* Replaced FontAwesomeIcon with a simple X */}
          X
        </button>
      </div>
      <div className="card-body">
        <p><strong>Location:</strong> {location}</p>
        {/* These lines directly display the temperature and vibration from the 'motor' prop */}
        <p><strong>Temp:</strong> {temperature}0.0 °C</p>
        <p><strong>Vib:</strong> {vibration} 0.00 g</p>
        <div className="motor-status">
          <span className={`status-dot ${getStatusClass(status)}`}></span>
          <span>{status}</span>
        </div>
      </div>
      <div className="last-updated">
        Updated: {formattedLastUpdated}
      </div>
    </div>
  );
}
