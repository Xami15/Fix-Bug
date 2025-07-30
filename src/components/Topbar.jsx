// src/components/Topbar.jsx
import React, { useState, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import DarkModeToggle from './DarkModeToggle';
import ProfileMenu from './ProfileMenu';
import '../layouts/MainLayout.css';

const Topbar = ({ sidebarCollapsed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  const sidebarWidth = sidebarCollapsed ? 80 : 250;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: `${sidebarWidth}px`,
        right: 0,
        height: "70px",
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        background: darkMode 
          ? "rgba(31, 41, 55, 0.95)" 
          : "rgba(49, 109, 223, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: darkMode 
          ? "1px solid rgba(75, 85, 99, 0.3)" 
          : "1px solid rgba(255, 255, 255, 0.2)",
        color: darkMode ? "#f9fafb" : "#ffffff",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: darkMode
          ? "0 8px 32px rgba(0, 0, 0, 0.12)"
          : "0 8px 32px rgba(49, 109, 223, 0.15)",
      }}
    >
      {/* Search Section */}
      <div style={{ 
        position: "relative", 
        display: "flex", 
        alignItems: "center",
        flex: "0 0 auto"
      }}>
        {/* Search Icon */}
        <div style={{
          position: "absolute",
          left: "16px",
          zIndex: 1,
          color: darkMode ? "#9ca3af" : "rgba(255, 255, 255, 0.7)",
          transition: "color 0.2s ease",
          transform: searchFocused ? "scale(1.1)" : "scale(1)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="21 21l-4.35-4.35"/>
          </svg>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search anything..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            padding: "12px 16px 12px 48px",
            borderRadius: "16px",
            border: "none",
            width: searchFocused ? "320px" : "280px",
            fontSize: "14px",
            fontWeight: "400",
            outline: "none",
            background: darkMode 
              ? "rgba(55, 65, 81, 0.8)" 
              : "rgba(255, 255, 255, 0.2)",
            color: darkMode ? "#f9fafb" : "#ffffff",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: searchFocused 
              ? (darkMode 
                  ? "0 0 0 2px rgba(99, 102, 241, 0.5), 0 8px 25px rgba(0, 0, 0, 0.15)"
                  : "0 0 0 2px rgba(255, 255, 255, 0.4), 0 8px 25px rgba(0, 0, 0, 0.1)")
              : "0 4px 12px rgba(0, 0, 0, 0.1)",
            "::placeholder": {
              color: darkMode ? "#9ca3af" : "rgba(255, 255, 255, 0.7)"
            }
          }}
        />

        {/* Search Results Indicator */}
        {searchTerm && (
          <div style={{
            position: "absolute",
            right: "16px",
            background: darkMode ? "#10b981" : "#22c55e",
            borderRadius: "50%",
            width: "8px",
            height: "8px",
            animation: "pulse 2s infinite"
          }} />
        )}
      </div>

      {/* Right Section */}
      <div style={{ 
        display: "flex", 
        gap: "16px", 
        alignItems: "center",
        flex: "0 0 auto"
      }}>
        {/* Notification Bell */}
        <button style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          position: "relative",
          ":hover": {
            background: darkMode 
              ? "rgba(55, 65, 81, 0.6)" 
              : "rgba(255, 255, 255, 0.2)"
          }
        }}
        onMouseEnter={(e) => {
          e.target.style.background = darkMode 
            ? "rgba(55, 65, 81, 0.6)" 
            : "rgba(255, 255, 255, 0.2)";
          e.target.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "transparent";
          e.target.style.transform = "translateY(0)";
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {/* Notification dot */}
          <div style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "8px",
            height: "8px",
            background: "#ef4444",
            borderRadius: "50%",
            border: `2px solid ${darkMode ? "#1f2937" : "rgb(49, 109, 223)"}`,
          }} />
        </button>

        {/* Divider */}
        <div style={{
          width: "1px",
          height: "24px",
          
          borderRadius: "0.5px"
        }} />

        {/* Dark Mode Toggle */}
        <div style={{
         
          // borderRadius: "12px",
          // padding: "4px",
          // backdropFilter: "blur(10px)",
          // WebkitBackdropFilter: "blur(10px)",
        }}>
          <DarkModeToggle />
        </div>

        {/* Profile Menu */}
        <div style={{
        
          borderRadius: "12px",
          
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
          <ProfileMenu darkMode={darkMode} />
        </div>
      </div>

      {/* Add keyframes for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          input::placeholder {
            color: ${darkMode ? "#9ca3af" : "rgba(255, 255, 255, 0.7)"} !important;
          }
        `}
      </style>
    </header>
  );
};

export default Topbar;