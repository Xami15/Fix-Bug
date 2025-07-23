// src/pages/LiveData.jsx
import React, { useEffect, useState } from "react";
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
import "./LiveData.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

export default function LiveData() {
  const { motors, liveMotorDataHistory, mqttConnected } = useMotors();
  const [selectedMotorId, setSelectedMotorId] = useState("");

  const chartTextColor = "#333"; // Light theme text color
  const chartLabelColor = "#6b7280";
  const chartGridColor = "rgba(0,0,0,0.1)";
  const chartTooltipBg = "rgba(0,0,0,0.8)";
  const chartTooltipColor = "#fff";

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

  // Get current motor's direct data from the 'motors' array (updated by MQTT)
  const currentMotor = motors.find(m => m.id === selectedMotorId);

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

  // Values for the info card display
  const displayedTemperature = isMotorEffectivelyDisconnected ? 0 : (currentMotor?.temperature ?? 0);
  const displayedVibration = isMotorEffectivelyDisconnected ? 0 : (currentMotor?.vibration ?? 0);


  const paddedTemperatures = isMotorEffectivelyDisconnected
    ? getChartDataPoints([], 0) // If disconnected/no data, chart all 0s
    : getChartDataPoints(dataForCharts.temperature, 0); // Otherwise, use actual data

  const paddedVibrations = isMotorEffectivelyDisconnected
    ? getChartDataPoints([], 0) // If disconnected/no data, chart all 0s
    : getChartDataPoints(dataForCharts.vibration, 0); // Otherwise, use actual data

  const paddedTimestamps = getChartDataPoints(dataForCharts.timestamps, "");


  const chartData = {
    labels: paddedTimestamps,
    datasets: [
      {
        label: "Temperature (°C)",
        data: paddedTemperatures,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: "Vibration",
        data: paddedVibrations,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { size: 14, weight: "600" }, color: chartTextColor },
      },
      tooltip: {
        backgroundColor: chartTooltipBg,
        titleColor: chartTooltipColor,
        bodyColor: chartTooltipColor,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: { font: { size: 13 }, color: chartTextColor },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: chartLabelColor },
      },
    },
  };

  return (
    <div className="live-data-container">
      <h1 style={{ textAlign: "center", fontSize: "1.9rem", fontWeight: "800" }}>
        Live Motor Data
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Motor Selection Dropdown */}
        <div style={{ flex: "1 1 250px", maxWidth: 300 }}>
          <label htmlFor="motorSelect" style={{ display: "block", fontWeight: "700", fontSize: "1.1rem", marginBottom: 10 }}>
            Select Motor:
          </label>
          <select
            id="motorSelect"
            value={selectedMotorId}
            onChange={(e) => setSelectedMotorId(e.target.value)}
            className="live-data-select"
          >
            {motors.length === 0 ? (
              <option value="">No Motors Added</option>
            ) : (
              motors.map((motor) => (
                <option key={motor.id} value={motor.id}>
                  {motor.name}
                </option>
              ))
            )}
          </select>
          {!mqttConnected && (
            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              MQTT Disconnected. Data may not be live.
            </p>
          )}
        </div>

        {/* Live Data Card for selected motor */}
        {selectedMotorId && currentMotor ? (
          <div className="live-data-card">
            <h2 style={{ color: "#4f46e5", fontWeight: "700", fontSize: "1.5rem", marginBottom: 10 }}>
              {currentMotor.name}
            </h2>
            <p style={{ fontSize: "1.1rem" }}>
              <strong>Temperature:</strong>{" "}
              <span style={{ color: "#ef4444" }}>
                {displayedTemperature.toFixed(1)} °C
              </span>
            </p>
            <p style={{ fontSize: "1.1rem", marginTop: 6 }}>
              <strong>Vibration:</strong>{" "}
              <span style={{ color: "#3b82f6" }}>
                {displayedVibration.toFixed(2)} g
              </span>
            </p>
            <p style={{ fontSize: "0.9rem", marginTop: 6 }}>
              <strong>Status:</strong>{" "}
              <span style={{ color: currentMotor.status === 'Healthy' ? '#28a745' : currentMotor.status === 'Warning' ? '#ffc107' : currentMotor.status === 'Fault' ? '#dc3545' : '#6c757d' }}>
                {currentMotor.status}
              </span>
            </p>
            <p style={{ fontSize: "0.9rem", marginTop: 6 }}>
              <strong>Last Updated:</strong>{" "}
              {currentMotor.lastUpdated ? currentMotor.lastUpdated.toLocaleTimeString() : 'N/A'}
            </p>
          </div>
        ) : (
          <div className="live-data-card">
            <p>Select a motor to view live data.</p>
          </div>
        )}
      </div>

      {/* Live Data Chart - ALWAYS SHOWS */}
      <div style={{ height: 360 }}>
        {selectedMotorId ? (
          <Line data={chartData} options={options} />
        ) : (
          <p style={{ textAlign: 'center', fontSize: '1.2rem', marginTop: '2rem', color: chartTextColor }}>
            Select a motor to see chart data.
          </p>
        )}
      </div>
    </div>
  );
}
