import React, { useState, useContext, useRef } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { FaTimes, FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaInfoCircle, FaCog, FaBolt, FaThermometerHalf, FaTachometerAlt } from 'react-icons/fa';
import './InductionMotorGuide.css';

const InductionMotorGuide = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const { theme } = useContext(ThemeContext);

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(255, 255, 255, 0.98)",
          cardBg: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.98)",
          cardBg: "rgba(55, 65, 81, 0.95)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.98)",
          cardBg: "rgba(30, 41, 59, 0.95)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          accentColor: "#60a5fa",
          successColor: "#34d399",
          warningColor: "#fbbf24",
          dangerColor: "#f87171"
        };
      default:
        return {
          background: "rgba(255, 255, 255, 0.98)",
          cardBg: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          accentColor: "#3b82f6",
          successColor: "#10b981",
          warningColor: "#f59e0b",
          dangerColor: "#ef4444"
        };
    }
  };

  const colors = getThemeColors();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '⚡' },
    { id: 'working', label: 'How It Works', icon: '🔧' },
    { id: 'components', label: 'Components', icon: '⚙️' },
    { id: 'applications', label: 'Applications', icon: '🏭' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' }
  ];

  const toggleVideo = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const renderOverview = () => (
    <div className="guide-content">
      <div className="video-section">
        <div className="video-container">
                     <video
             ref={videoRef}
             className="motor-video"
             controls
             preload="metadata"
           >
             <source src="/videos/induction-motor-operation.mp4.mp4" type="video/mp4" />
             Your browser does not support the video tag.
           </video>
          <div className="video-info">
            <h3>Induction Motor Operation</h3>
            <p>Watch how an induction motor works in real-time</p>
          </div>
        </div>
      </div>
      
      <div className="info-grid">
        <div className="info-card">
          <div className="info-icon">⚡</div>
          <h4>Power Source</h4>
          <p>AC (Alternating Current) power supply</p>
        </div>
        <div className="info-card">
          <div className="info-icon">🔄</div>
          <h4>Rotation</h4>
          <p>Continuous rotation at synchronous speed</p>
        </div>
        <div className="info-card">
          <div className="info-icon">🔌</div>
          <h4>Connection</h4>
          <p>Three-phase or single-phase connection</p>
        </div>
        <div className="info-card">
          <div className="info-icon">📊</div>
          <h4>Efficiency</h4>
          <p>High efficiency (85-95%)</p>
        </div>
      </div>
    </div>
  );

  const renderWorking = () => (
    <div className="guide-content">
      <div className="working-steps">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>AC Current Flow</h4>
            <p>Alternating current flows through the stator windings, creating a rotating magnetic field.</p>
          </div>
        </div>
        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Magnetic Induction</h4>
            <p>The rotating magnetic field induces current in the rotor conductors (Faraday's law).</p>
          </div>
        </div>
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Rotor Current</h4>
            <p>Induced current in rotor creates its own magnetic field.</p>
          </div>
        </div>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h4>Torque Generation</h4>
            <p>Interaction between stator and rotor magnetic fields creates torque.</p>
          </div>
        </div>
        <div className="step">
          <div className="step-number">5</div>
          <div className="step-content">
            <h4>Rotation</h4>
            <p>Rotor follows the rotating magnetic field, creating continuous rotation.</p>
          </div>
        </div>
      </div>
      
      <div className="technical-details">
        <h3>Technical Specifications</h3>
        <div className="specs-grid">
          <div className="spec-item">
            <FaBolt className="spec-icon" />
            <span>Power Range: 0.1 kW - 10,000 kW</span>
          </div>
          <div className="spec-item">
            <FaTachometerAlt className="spec-icon" />
            <span>Speed: 900-3600 RPM</span>
          </div>
          <div className="spec-item">
            <FaThermometerHalf className="spec-icon" />
            <span>Temperature: -40°C to +60°C</span>
          </div>
          <div className="spec-item">
            <FaCog className="spec-icon" />
            <span>Efficiency: 85-95%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderComponents = () => (
    <div className="guide-content">
      <div className="components-grid">
        <div className="component-card">
          <div className="component-image">🔄</div>
          <h4>Stator</h4>
          <ul>
            <li>Stationary outer shell</li>
            <li>Contains three-phase windings</li>
            <li>Creates rotating magnetic field</li>
            <li>Made of laminated steel</li>
          </ul>
        </div>
        <div className="component-card">
          <div className="component-image">⚙️</div>
          <h4>Rotor</h4>
          <ul>
            <li>Rotating inner part</li>
            <li>Squirrel cage or wound rotor</li>
            <li>Conductors carry induced current</li>
            <li>Connected to output shaft</li>
          </ul>
        </div>
        <div className="component-card">
          <div className="component-image">🔧</div>
          <h4>Bearings</h4>
          <ul>
            <li>Support rotor rotation</li>
            <li>Reduce friction</li>
            <li>Ball or roller bearings</li>
            <li>Require lubrication</li>
          </ul>
        </div>
        <div className="component-card">
          <div className="component-image">🌡️</div>
          <h4>Cooling System</h4>
          <ul>
            <li>Prevents overheating</li>
            <li>Air or liquid cooling</li>
            <li>Cooling fins or fans</li>
            <li>Maintains efficiency</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="guide-content">
      <div className="applications-section">
        <h3>Industrial Applications</h3>
        <div className="applications-grid">
          <div className="application-item">
            <div className="app-icon">🏭</div>
            <h4>Manufacturing</h4>
            <p>Conveyors, pumps, compressors, fans</p>
          </div>
          <div className="application-item">
            <div className="app-icon">🏢</div>
            <h4>HVAC Systems</h4>
            <p>Air handlers, chillers, cooling towers</p>
          </div>
          <div className="application-item">
            <div className="app-icon">⚡</div>
            <h4>Power Generation</h4>
            <p>Pumps, fans, auxiliary equipment</p>
          </div>
          <div className="application-item">
            <div className="app-icon">🚗</div>
            <h4>Automotive</h4>
            <p>Electric vehicles, hybrid systems</p>
          </div>
          <div className="application-item">
            <div className="app-icon">🏠</div>
            <h4>Home Appliances</h4>
            <p>Washing machines, refrigerators</p>
          </div>
          <div className="application-item">
            <div className="app-icon">🚢</div>
            <h4>Marine</h4>
            <p>Propulsion systems, pumps</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="guide-content">
      <div className="maintenance-section">
        <h3>Maintenance Best Practices</h3>
        <div className="maintenance-grid">
          <div className="maintenance-card">
            <h4>Regular Inspections</h4>
            <ul>
              <li>Visual inspection monthly</li>
              <li>Check for unusual noise</li>
              <li>Monitor temperature</li>
              <li>Inspect connections</li>
            </ul>
          </div>
          <div className="maintenance-card">
            <h4>Vibration Monitoring</h4>
            <ul>
              <li>Measure vibration levels</li>
              <li>Check bearing condition</li>
              <li>Monitor alignment</li>
              <li>Track trends over time</li>
            </ul>
          </div>
          <div className="maintenance-card">
            <h4>Temperature Monitoring</h4>
            <ul>
              <li>Monitor winding temperature</li>
              <li>Check bearing temperature</li>
              <li>Ensure proper cooling</li>
              <li>Prevent overheating</li>
            </ul>
          </div>
          <div className="maintenance-card">
            <h4>Predictive Maintenance</h4>
            <ul>
              <li>Use IoT sensors</li>
              <li>Data-driven decisions</li>
              <li>Prevent failures</li>
              <li>Optimize performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'working':
        return renderWorking();
      case 'components':
        return renderComponents();
      case 'applications':
        return renderApplications();
      case 'maintenance':
        return renderMaintenance();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="induction-motor-guide-overlay">
      <div 
        className="induction-motor-guide-modal"
        style={{
          background: colors.background,
          border: `1px solid ${colors.borderColor}`,
          color: colors.textColor
        }}
      >
        <div className="guide-header">
          <h2>Induction Motor Guide</h2>
          <button onClick={onClose} className="close-button">
            <FaTimes />
          </button>
        </div>
        
        <div className="guide-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                background: activeTab === tab.id ? colors.accentColor : 'transparent',
                color: activeTab === tab.id ? 'white' : colors.textColor,
                borderColor: colors.borderColor
              }}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="guide-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InductionMotorGuide; 