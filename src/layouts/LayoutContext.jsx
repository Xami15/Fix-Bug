// src/context/LayoutContext.jsx
import React, { createContext, useState, useContext } from 'react';

// Create the LayoutContext
export const LayoutContext = createContext();

/**
 * LayoutProvider component manages the global layout state,
 * specifically for the sidebar's collapsed/expanded status.
 * It provides `isSidebarCollapsed` and `toggleSidebar` to its children.
 */
export const LayoutProvider = ({ children }) => {
  // State to track if the sidebar is collapsed.
  // Initialize from localStorage for persistence, defaulting to false (expanded).
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('isSidebarCollapsed');
    // Ensure that if localStorage returns null/undefined, we default to false (expanded)
    return savedState !== null ? JSON.parse(savedState) : false;
  });

  // Use useEffect to save the state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('isSidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Function to toggle the sidebar's state
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Provide the state and the toggle function to all children components
  return (
    <LayoutContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Custom hook for convenience to consume the layout context.
 * This makes it easier to access `isSidebarCollapsed` and `toggleSidebar`
 * in any component wrapped by LayoutProvider.
 */
export const useLayout = () => useContext(LayoutContext);
