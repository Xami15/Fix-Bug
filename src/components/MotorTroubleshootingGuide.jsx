import React, { useState } from 'react';
import './MotorTroubleshootingGuide.css';

const MotorTroubleshootingGuide = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState(null);

  const troubleshootingItems = [
    {
      id: 'connection',
      title: 'Connection Issues',
      icon: '🌐',
      solutions: [
        'Check your internet connection',
        'Ensure you are logged in to your account',
        'Try refreshing the page',
        'Clear your browser cache and cookies'
      ]
    },
    {
      id: 'validation',
      title: 'Form Validation Errors',
      icon: '✅',
      solutions: [
        'Motor name must be at least 3 characters long',
        'Motor ID can only contain uppercase letters, numbers, and hyphens',
        'Location field cannot be empty',
        'Motor ID must be unique within your company'
      ]
    },
    {
      id: 'database',
      title: 'Database Errors',
      icon: '🗄️',
      solutions: [
        'Motor ID already exists - try a different ID',
        'Check if your account has proper permissions',
        'Contact support if the issue persists',
        'Try using the Quick Add Motor wizard instead'
      ]
    },
    {
      id: 'authentication',
      title: 'Authentication Issues',
      icon: '🔐',
      solutions: [
        'Make sure you are logged in',
        'Log out and log back in',
        'Check if your session has expired',
        'Try using a different browser'
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  return (
    <div className="troubleshooting-overlay">
      <div className="troubleshooting-modal">
        <div className="troubleshooting-header">
          <h2>🛠️ Motor Addition Troubleshooting</h2>
          <button className="troubleshooting-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="troubleshooting-content">
          <p className="troubleshooting-intro">
            Having trouble adding a motor? Here are common issues and solutions:
          </p>
          
          <div className="troubleshooting-sections">
            {troubleshootingItems.map((item) => (
              <div key={item.id} className="troubleshooting-section">
                <button
                  className={`troubleshooting-section-header ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => toggleSection(item.id)}
                >
                  <span className="section-icon">{item.icon}</span>
                  <span className="section-title">{item.title}</span>
                  <span className="section-arrow">▼</span>
                </button>
                
                {activeSection === item.id && (
                  <div className="troubleshooting-solutions">
                    <ul>
                      {item.solutions.map((solution, index) => (
                        <li key={index}>{solution}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="troubleshooting-footer">
            <p>Still having issues? Contact support at support@sepmonitoring.com</p>
            <button className="troubleshooting-close" onClick={onClose}>
              Got it, thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorTroubleshootingGuide; 