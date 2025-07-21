// src/components/Topbar.jsx
import React, { useState, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import DarkModeToggle from './DarkModeToggle';
import ProfileMenu from './ProfileMenu'; // <-- Import the new ProfileMenu component
import '../layouts/MainLayout.css';

const Topbar = ({ sidebarCollapsed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { darkMode } = useContext(ThemeContext);

  const sidebarWidth = sidebarCollapsed ? 80 : 250; // Width in px

  return (
    <header
      className="topbar"
      style={{
        position: "fixed",
        top: 0,
        left: `${sidebarWidth}px`, // dynamically adjust
        right: 0,
        height: "60px",
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 1rem",
        backgroundColor: darkMode ? "#1f2937" : "rgb(49, 109, 223)",
        color: darkMode ? "#e5e7eb" : "#111827",
        boxShadow: darkMode
          ? "0 2px 6px rgba(0,0,0,0.3)"
          : "0 2px 4px rgba(0,0,0,0.1)",
        transition: "left 0.3s ease",
      }}
    >
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          border: darkMode ? "1px solid rgb(40, 49, 63)" : "1px solid #d1d1d1",
          width: "250px",
          fontSize: "1rem",
          outline: "none",
          backgroundColor: darkMode ? "#374151" : "#fff",
          color: darkMode ? "#e5e7eb" : "#111827",
        }}
      />

      {/* Toggle & Profile */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <DarkModeToggle />
        <ProfileMenu darkMode={darkMode} />
      </div>
    </header>
  );
};

export default Topbar;
