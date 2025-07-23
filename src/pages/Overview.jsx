import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import { useMotors } from '../context/MotorsContext';
import './Overview.css';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

export default function Overview() {
  const { motors } = useMotors();

  const statusCounts = useMemo(() => motors.reduce(
    (acc, motor) => {
      // FIX: Ensure motor.status is a string before calling .toLowerCase()
      // If motor.status is undefined or null, it will default to 'unknown'.
      const status = (motor.status || 'unknown').toLowerCase(); // <-- FIX IS HERE

      if (status === "healthy") acc.healthy += 1;
      else if (status === "warning") acc.warning += 1;
      else if (status === "fault") acc.fault += 1;
      // Note: If you have 'disconnected' or other statuses, they won't be counted here
      // unless you add more `else if` conditions for them. This current setup
      // only tracks healthy, warning, and fault.
      return acc;
    },
    { healthy: 0, warning: 0, fault: 0 }
  ), [motors]);

  const avgTemperature = useMemo(() => (
    motors.length > 0 ? (motors.reduce((sum, m) => sum + parseFloat(m.temperature || 0), 0) / motors.length).toFixed(1) : "0.0"
  ), [motors]);

  const avgVibration = useMemo(() => (
    motors.length > 0 ? (motors.reduce((sum, m) => sum + parseFloat(m.vibration || 0), 0) / motors.length).toFixed(2) : "0.00"
  ), [motors]);

  // Hardcode colors for light theme since theme toggle is removed
  // NOTE: These chart colors are currently hardcoded for a light theme.
  // If you want them to respond to dark mode, you'll need to re-integrate
  // the ThemeContext here and use dynamic colors.
  const pieData = {
    labels: ["Healthy", "Warning", "Fault"],
    datasets: [
      {
        label: "Motors Status",
        data: [statusCounts.healthy, statusCounts.warning, statusCounts.fault],
        backgroundColor: ["#28a745", "#ffc107", "#dc3545"], // Light theme colors
        hoverOffset: 20,
      },
    ],
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const tempTrend = [44, 45, 46, 45, 47, 48, 46];
  const vibrationTrend = [0.12, 0.13, 0.15, 0.14, 0.13, 0.16, 0.15];

  const chartTextColor = "#333"; // Light theme text color
  const chartGridColor = "rgba(0,0,0,0.1)"; // Light theme grid color
  const chartTooltipBg = "#fff"; // Light theme tooltip background

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { color: chartTextColor } },
      tooltip: { mode: "index", intersect: false, backgroundColor: chartTooltipBg, titleColor: chartTextColor, bodyColor: chartTextColor },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: chartTextColor },
        grid: { color: chartGridColor },
      },
      x: {
        ticks: { color: chartTextColor },
        grid: { color: chartGridColor },
      },
    },
  };

  return (
    <div className="overview-container">
      <h1>Overview</h1>

      <section className="summary-cards-section">
        {[{
          title: "Total Motors",
          value: motors.length,
          color: "#007bff",
        }, {
          title: "Healthy Motors",
          value: statusCounts.healthy,
          color: "#28a745",
        }, {
          title: "Warning Motors",
          value: statusCounts.warning,
          color: "#ffc107",
        }, {
          title: "Fault Motors",
          value: statusCounts.fault,
          color: "#dc3545",
        }].map(({ title, value, color }) => (
          <div
            key={title}
            className="overview-card"
            style={{ color }}
          >
            <div className="overview-card-title">{title}</div>
            <div className="overview-card-value">{value}</div>
          </div>
        ))}

        <div className="overview-card combined-card">
          <div className="combined-card-item" style={{ color: "#fd7e14" }}>
            <div className="overview-card-title">Avg. Temperature (°C)</div>
            <div className="overview-card-value">{avgTemperature}</div>
          </div>

          <div className="combined-card-separator" />

          <div className="combined-card-item" style={{ color: "#6f42c1" }}>
            <div className="overview-card-title">Avg. Vibration (g)</div>
            <div className="overview-card-value">{avgVibration}</div>
          </div>
        </div>
      </section>

      <section className="charts-section">
        <div className="chart-container">
          <h3>Status Distribution</h3>
          <Pie data={pieData} />
        </div>

        <div className="chart-container">
          <h3>Temperature & Vibration Trends (Last 7 days)</h3>
          <Line
            options={lineOptions}
            data={{
              labels: days,
              datasets: [
                {
                  label: "Temperature (°C)",
                  data: tempTrend,
                  borderColor: "#fd7e14",
                  backgroundColor: "rgba(253,126,20,0.3)",
                  yAxisID: "y",
                  tension: 0.3,
                  fill: true,
                },
                {
                  label: "Vibration (g)",
                  data: vibrationTrend,
                  borderColor: "#6f42c1",
                  backgroundColor: "rgba(111,66,193,0.3)",
                  yAxisID: "y1",
                  tension: 0.3,
                  fill: true,
                },
              ],
            }}
          />
        </div>
      </section>
    </div>
  );
}