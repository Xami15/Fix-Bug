import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import both providers
import { MotorsProvider } from './context/MotorsContext';
import { ThemeProvider } from './context/ThemeContext'; // Add this line

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap App with both providers */}
    <ThemeProvider>
      <MotorsProvider>
        <App />
      </MotorsProvider>
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();