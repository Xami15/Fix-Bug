// src/components/Topbar.jsx
import React, { useState, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import DarkModeToggle from './DarkModeToggle';
import ProfileMenu from './ProfileMenu';
import SearchDropdown from './SearchDropdown';
import NotificationDropdown from './NotificationDropdown';
import '../layouts/MainLayout.css';

const Topbar = ({ sidebarCollapsed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { theme, darkMode } = useContext(ThemeContext);

  const sidebarWidth = sidebarCollapsed ? 80 : 250;

  // Theme-aware colors
  const getTopbarColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(49, 109, 223, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.2)",
          textColor: "#ffffff",
          searchBg: "rgba(255, 255, 255, 0.2)",
          searchColor: "#ffffff",
          iconColor: "rgba(255, 255, 255, 0.7)",
          placeholderColor: "rgba(255, 255, 255, 0.7)",
          boxShadow: "0 8px 32px rgba(49, 109, 223, 0.15)"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.95)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#ffffff",
          searchBg: "rgba(55, 65, 81, 0.8)",
          searchColor: "#ffffff",
          iconColor: "#9ca3af",
          placeholderColor: "#9ca3af",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          searchBg: "rgba(30, 41, 59, 0.8)",
          searchColor: "#f1f5f9",
          iconColor: "rgba(241, 245, 249, 0.7)",
          placeholderColor: "rgba(241, 245, 249, 0.7)",
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.15)"
        };
      default:
        return {
          background: "rgba(49, 109, 223, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.2)",
          textColor: "#ffffff",
          searchBg: "rgba(255, 255, 255, 0.2)",
          searchColor: "#ffffff",
          iconColor: "rgba(255, 255, 255, 0.7)",
          placeholderColor: "rgba(255, 255, 255, 0.7)",
          boxShadow: "0 8px 32px rgba(49, 109, 223, 0.15)"
        };
    }
  };

  const colors = getTopbarColors();

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: `${sidebarWidth}px`,
        right: 0,
        height: "70px",
        zIndex: 1001,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        background: colors.background,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${colors.borderColor}`,
        color: colors.textColor,
        transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: colors.boxShadow,
      }}
    >
      {/* Search Section */}
      <SearchDropdown 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
      />

      {/* Right Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* Divider */}
        <div style={{
          width: "1px",
          height: "24px",
          background: colors.borderColor,
          borderRadius: "0.5px"
        }} />

        {/* Dark Mode Toggle */}
        <div style={{
          borderRadius: "12px",
          padding: "4px",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
          <DarkModeToggle />
        </div>

        {/* Profile Menu */}
        <div style={{
          borderRadius: "12px",
          padding: "4px",
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
            color: ${colors.placeholderColor} !important;
          }
        `}
      </style>
    </header>
  );
};

export default Topbar;