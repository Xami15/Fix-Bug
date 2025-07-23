// src/pages/Prediction.jsx
import { useMotors } from '../context/MotorsContext';
import { useState, useEffect } from 'react';
import './Prediction.css';

export default function Prediction() {
  const { motors, liveMotorDataHistory, removeMotor } = useMotors();

  const [derivedPredictions, setDerivedPredictions] = useState([]);

  const CONNECTION_THRESHOLD_MS = 10000;
  const now = Date.now();

  const statusColors = {
    healthy: "#28a745",
    warning: "#ffc107",
    fault: "#dc3545",
    disconnected: "#6c757d",
    unknown: "#007bff"
  };

  useEffect(() => {
    const generated = motors.map((motor) => {
      const latestData = liveMotorDataHistory[motor.id];

      let currentTemperature = motor.temperature;
      let currentVibration = motor.vibration;
      let currentStatus = motor.status;
      let currentConfidence = motor.confidence;
      let currentLastChecked = motor.lastUpdated;

      if (latestData && latestData.temperature.length > 0 && latestData.vibration.length > 0) {
        currentTemperature = latestData.temperature.at(-1);
        currentVibration = latestData.vibration.at(-1);
        currentLastChecked = new Date(latestData.timestamps.at(-1));

        currentStatus = motor.status;
        currentConfidence = motor.confidence;

      } else if (motor.status === 'Disconnected' && motor.temperature === 'N/A') {
        currentStatus = 'Disconnected';
        currentTemperature = 'N/A';
        currentVibration = 'N/A';
        currentConfidence = 0;
        currentLastChecked = null;
      }
      // Consider adding a default status if motor.status could be undefined here
      // For example: currentStatus = motor.status || 'unknown';

      const displayTemperature = typeof currentTemperature === 'number' ? currentTemperature.toFixed(1) : currentTemperature;
      const displayVibration = typeof currentVibration === 'number' ? currentVibration.toFixed(2) : currentVibration;


      return {
        id: motor.id,
        name: motor.name,
        confidence: currentConfidence,
        temperature: displayTemperature,
        vibration: displayVibration,
        status: currentStatus, // This status goes into derivedPredictions
        lastChecked: currentLastChecked
      };
    });

    setDerivedPredictions(generated);
  }, [motors, liveMotorDataHistory]);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this motor?")) {
      removeMotor(id);
    }
  };

  const statusCounts = derivedPredictions.reduce(
    (acc, motor) => {
      // FIX: Ensure motor.status is a string before calling .toLowerCase()
      // If motor.status is undefined or null, it will default to 'unknown'
      const status = (motor.status || 'unknown').toLowerCase();

      if (status === "healthy") acc.healthy += 1;
      else if (status === "warning") acc.warning += 1; // Typo here: should be acc.warning
      else if (status === "fault") acc.fault += 1;
      else if (status === "disconnected") acc.disconnected += 1;
      else acc.unknown += 1;
      return acc;
    },
    { healthy: 0, warning: 0, fault: 0, disconnected: 0, unknown: 0 }
  );

  // Correction for the typo I spotted in the reduce:
  //
  // Original:
  // else if (status === "warning") acc.healthy += 1;
  //
  // Should be:
  // else if (status === "warning") acc.warning += 1;


  const connectionStatusDisplay = motors.length > 0 && motors.every(m => m.status !== 'Disconnected' && m.lastUpdated && (now - m.lastUpdated.getTime() < CONNECTION_THRESHOLD_MS))
    ? "Connected"
    : "Mixed/Disconnected";

  return (
    <div className="prediction-container">
      <header className="prediction-header">
        <h1>Motor Predictions</h1>
        <div className={`connection-status-badge ${connectionStatusDisplay.toLowerCase().includes('connected') ? 'connected' : 'disconnected'}`}>
          {connectionStatusDisplay}
        </div>
      </header>

      <section className="prediction-summary">
        <div>🟢 Healthy: <span className="status-count-text healthy-text">{statusCounts.healthy}</span></div>
        <div>⚪ Disconnected: <span className="status-count-text disconnected-text">{statusCounts.disconnected}</span></div>
        <div>🟠 Warning: <span className="status-count-text warning-text">{statusCounts.warning}</span></div>
        <div>🔴 Fault: <span className="status-count-text fault-text">{statusCounts.fault}</span></div>
        {statusCounts.unknown > 0 && <div>🔵 Unknown: <span className="status-count-text unknown-text">{statusCounts.unknown}</span></div>}
      </section>

      <section className="prediction-grid">
        {derivedPredictions.length === 0 ? (
          <p className="no-predictions-text">No motors added yet or no data received. Add motors from the dashboard and ensure they are publishing MQTT data.</p>
        ) : (
          derivedPredictions.map((motor) => {
            const statusLower = (motor.status || 'unknown').toLowerCase(); // Also apply the fix here just in case, though the reduce was the primary issue
            const isConnectedBasedOnTime = motor.lastChecked && (now - motor.lastChecked.getTime() < CONNECTION_THRESHOLD_MS);
            const displayConnectionStatus = (motor.status === 'Disconnected' || motor.status === 'Unknown' || !isConnectedBasedOnTime)
              ? 'Disconnected'
              : 'Connected';
            const borderColor = statusColors[statusLower] || statusColors.unknown;


            return (
              <article
                key={motor.id}
                className={`prediction-card prediction-card--${statusLower}`}
                style={{ border: `2px solid ${borderColor}` }}
              >
                <h2>
                  {motor.name}
                  <span
                    className={`motor-connection-status ${displayConnectionStatus.toLowerCase()}`}
                    title={displayConnectionStatus}
                  >
                    {displayConnectionStatus}
                  </span>
                </h2>
                <p>Status: <span className="status-badge" style={{ color: borderColor }}>{motor.status}</span></p>
                <p>Confidence: <strong>{typeof motor.confidence === 'number' ? `${motor.confidence}%` : 'N/A'}</strong></p>
                <p>Temperature: {motor.temperature} 0.0 °C</p>
                <p>Vibration: {motor.vibration} 0.00 g</p>
                <p className="last-checked-info">
                  Last checked: {motor.lastChecked ? motor.lastChecked.toLocaleTimeString() : 'N/A'}
                </p>
                <button onClick={() => handleDelete(motor.id)} className="delete-button">Delete</button>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}