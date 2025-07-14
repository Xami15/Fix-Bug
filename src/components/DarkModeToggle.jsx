// src/components/DarkModeToggle.jsx
import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

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
        fontSize: 14,
      }}
    >
      {darkMode ? "Light Mode" : "Dark Mode"}
    </button>
  );
};

export default DarkModeToggle;