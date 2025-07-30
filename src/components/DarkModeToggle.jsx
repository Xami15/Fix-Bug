// src/components/DarkModeToggle.jsx
import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { FaMoon, FaSun } from 'react-icons/fa';

const DarkModeToggle = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleDarkMode}
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
        e.target.style.background = darkMode 
          ? "rgba(55, 65, 81, 0.6)" 
          : "rgba(255, 255, 255, 0.2)";
        e.target.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "transparent";
        e.target.style.transform = "translateY(0)";
      }}
      aria-label="Toggle dark mode"
    >
      {darkMode ? <FaSun /> : <FaMoon />}
    </button>
  );
};

export default DarkModeToggle;