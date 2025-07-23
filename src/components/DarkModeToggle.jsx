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
        padding: "6px 12px",
        cursor: "pointer",
        borderRadius: 4,
        border: "none",
        backgroundColor: darkMode ? "#eee" : "#222",
        color: darkMode ? "#222" : "#eee",
        fontWeight: "600",
        fontSize: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Toggle dark mode"
    >
      {darkMode ? <FaSun /> : <FaMoon />}
    </button>
  );
};

export default DarkModeToggle;