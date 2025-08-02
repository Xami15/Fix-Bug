// src/context/ThemeContext.jsx
import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light'; // Default to light theme
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => {
      switch (prev) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'blue';
        case 'blue':
          return 'light';
        default:
          return 'light';
      }
    });
  };

  // For backward compatibility, provide darkMode boolean
  const darkMode = theme === 'dark' || theme === 'blue';

  return (
    <ThemeContext.Provider value={{ theme, darkMode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
