// src/layouts/MainLayout.jsx
import { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar"; // ✅ Add Topbar
import { Outlet } from "react-router-dom";
import "./MainLayout.css";
import { ThemeContext } from '../context/ThemeContext';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const interval = setInterval(() => {
      const newPredictions = [
        {
          id: 1,
          name: "Motor A",
          status: "Healthy",
          confidence: 92,
          temperature: 38,
          vibration: 0.05,
          lastChecked: new Date(),
        },
        {
          id: 2,
          name: "Motor B",
          status: "Faulty",
          confidence: 85,
          temperature: 45,
          vibration: 0.22,
          lastChecked: new Date(),
        },
      ];
      setPredictions(newPredictions);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`layout-container ${darkMode ? "dark-mode" : "light-mode"}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* ✅ TOPBAR with sidebarCollapsed prop */}
      <Topbar sidebarCollapsed={collapsed} />

      <main className={`main-content ${collapsed ? "collapsed" : ""}`}>
        <Outlet context={{ predictions }} />
      </main>
    </div>
  );
}
