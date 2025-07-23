import React, { useEffect, useState } from 'react';
import { subscribeToSensorData, getLatestSensorData } from '../services/databaseService';

const SensorDataDisplay = ({ motorId }) => {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Get initial data
    getLatestSensorData(motorId)
      .then(data => {
        if (data) setSensorData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching initial sensor data:', err);
        setError('Failed to load sensor data');
        setLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSensorData(motorId, (data) => {
      if (data && data.length > 0) {
        setSensorData(data[0]);
      }
    });

    return () => unsubscribe();
  }, [motorId]);

  if (loading) return <div>Loading sensor data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!sensorData) return <div>No sensor data available</div>;

  return (
    <div className="sensor-data-display">
      <h3>Motor Sensor Readings</h3>
      
      <div className="data-section">
        <h4>Temperature</h4>
        <div className="data-value">{sensorData.temperature}°C</div>
      </div>

      <div className="data-section">
        <h4>Acceleration</h4>
        <div className="data-grid">
          <div className="data-item">
            <label>X:</label>
            <span>{sensorData.accelerationX} m/s²</span>
          </div>
          <div className="data-item">
            <label>Y:</label>
            <span>{sensorData.accelerationY} m/s²</span>
          </div>
          <div className="data-item">
            <label>Z:</label>
            <span>{sensorData.accelerationZ} m/s²</span>
          </div>
        </div>
      </div>

      <div className="data-section">
        <h4>Gyroscope</h4>
        <div className="data-grid">
          <div className="data-item">
            <label>X:</label>
            <span>{sensorData.gyroX}°/s</span>
          </div>
          <div className="data-item">
            <label>Y:</label>
            <span>{sensorData.gyroY}°/s</span>
          </div>
          <div className="data-item">
            <label>Z:</label>
            <span>{sensorData.gyroZ}°/s</span>
          </div>
        </div>
      </div>

      <div className="data-section">
        <h4>Additional Metrics</h4>
        <div className="data-grid">
          <div className="data-item">
            <label>Amplitude:</label>
            <span>{sensorData.amplitude} mm</span>
          </div>
          <div className="data-item">
            <label>Angular Velocity:</label>
            <span>{sensorData.angularVelocity} rad/s</span>
          </div>
        </div>
      </div>

      <div className="timestamp">
        Last updated: {new Date(sensorData.timestamp).toLocaleString()}
      </div>

      <style jsx>{`
        .sensor-data-display {
          padding: 20px;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin: 20px;
        }

        .data-section {
          margin: 20px 0;
        }

        .data-section h4 {
          margin-bottom: 10px;
          color: #333;
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .data-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .data-value {
          font-size: 24px;
          font-weight: bold;
          color: #2196F3;
        }

        .timestamp {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: right;
        }

        label {
          color: #666;
          font-weight: 500;
        }

        span {
          color: #333;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default SensorDataDisplay;