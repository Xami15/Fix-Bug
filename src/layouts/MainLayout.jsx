// src/layouts/MainLayout.jsx
import { useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { Outlet } from "react-router-dom";
import "./MainLayout.css";
import { ThemeContext } from '../context/ThemeContext';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useContext(ThemeContext);

  // Determine the theme class based on the current theme
  const getThemeClass = () => {
    switch (theme) {
      case 'light':
        return 'light-mode';
      case 'dark':
        return 'dark-mode';
      case 'blue':
        return 'blue-mode';
      default:
        return 'light-mode';
    }
  };

  return (
    <div className={`layout-container ${getThemeClass()}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Topbar sidebarCollapsed={collapsed} />

      <main className={`main-content ${collapsed ? "collapsed" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
