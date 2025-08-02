// src/components/DarkModeToggle.jsx
import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { FaMoon, FaSun, FaPalette } from 'react-icons/fa';

const DarkModeToggle = () => {
  const { theme, cycleTheme } = useContext(ThemeContext);

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <FaSun />;
      case 'dark':
        return <FaMoon />;
      case 'blue':
        return <FaPalette />;
      default:
        return <FaSun />;
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case 'light':
        return 'Light Theme';
      case 'dark':
        return 'Dark Theme';
      case 'blue':
        return 'Blue Theme';
      default:
        return 'Light Theme';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      style={{
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
        fontSize: "20px",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(255, 255, 255, 0.2)";
        e.target.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "transparent";
        e.target.style.transform = "translateY(0)";
      }}
      aria-label={getTooltip()}
      title={getTooltip()}
    >
      {getIcon()}
    </button>
  );
};

export default DarkModeToggle;