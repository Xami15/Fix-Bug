import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useMotors } from '../context/MotorsContext';
import { FaSearch, FaCog, FaMapMarkerAlt, FaThermometerHalf, FaWaveSquare } from 'react-icons/fa';
import UnitConverter from '../utils/unitConverter';

const SearchDropdown = ({ searchTerm, setSearchTerm, searchFocused, setSearchFocused }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredMotors, setFilteredMotors] = useState([]);
  const { motors } = useMotors();
  const { theme } = useContext(ThemeContext);
  
  // State for display preferences
  const [displayPreferences, setDisplayPreferences] = useState(() => {
    const saved = localStorage.getItem("displayPreferences");
    return saved ? JSON.parse(saved) : {
      temperatureUnit: "C",
      vibrationUnit: "m/s²"
    };
  });

  // Effect to listen for unit changes
  useEffect(() => {
    const handleUnitChange = (event) => {
      const { type, unit } = event.detail;
      setDisplayPreferences(prev => {
        const updated = { ...prev };
        if (type === 'temperature') {
          updated.temperatureUnit = unit;
        } else if (type === 'vibration') {
          updated.vibrationUnit = unit;
        }
        return updated;
      });
    };

    window.addEventListener('unitChanged', handleUnitChange);
    return () => window.removeEventListener('unitChanged', handleUnitChange);
  }, []);

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          searchBg: "rgba(255, 255, 255, 0.2)",
          searchColor: "#ffffff",
          iconColor: "rgba(255, 255, 255, 0.7)"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.95)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
          searchBg: "rgba(55, 65, 81, 0.8)",
          searchColor: "#ffffff",
          iconColor: "#9ca3af"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
          searchBg: "rgba(30, 41, 59, 0.8)",
          searchColor: "#f1f5f9",
          iconColor: "rgba(241, 245, 249, 0.7)"
        };
      default:
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          searchBg: "rgba(255, 255, 255, 0.2)",
          searchColor: "#ffffff",
          iconColor: "rgba(255, 255, 255, 0.7)"
        };
    }
  };

  const colors = getThemeColors();

  // Filter motors based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = motors.filter(motor => 
        motor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        motor.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        motor.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMotors(filtered);
      setShowDropdown(true);
    } else {
      setFilteredMotors([]);
      setShowDropdown(false);
    }
  }, [searchTerm, motors]);

  // Handle search input focus
  const handleFocus = () => {
    setSearchFocused(true);
    if (searchTerm.trim()) {
      setShowDropdown(true);
    }
  };

  // Handle search input blur
  const handleBlur = () => {
    setSearchFocused(false);
    // Delay hiding dropdown to allow clicking on results
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleMotorSelect = (motor) => {
    setSearchTerm(motor.name);
    setShowDropdown(false);
    setSearchFocused(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy':
      case 'NORMAL':
        return '#10b981';
      case 'Warning':
      case 'WARNING':
        return '#f59e0b';
      case 'Fault':
      case 'FAULT':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Healthy':
      case 'NORMAL':
        return 'Healthy';
      case 'Warning':
      case 'WARNING':
        return 'Warning';
      case 'Fault':
      case 'FAULT':
        return 'Fault';
      default:
        return 'Unknown';
    }
  };

  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      {/* Search Icon */}
      <div style={{
        position: "absolute",
        left: "16px",
        zIndex: 1,
        color: colors.iconColor,
        transition: "color 0.2s ease",
        transform: searchFocused ? "scale(1.1)" : "scale(1)",
      }}>
        <FaSearch />
      </div>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search motors by name, ID, or location..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          padding: "12px 16px 12px 48px",
          borderRadius: "16px",
          border: "none",
          width: searchFocused ? "320px" : "280px",
          fontSize: "14px",
          fontWeight: "400",
          outline: "none",
          background: colors.searchBg,
          color: colors.searchColor,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: searchFocused 
            ? "0 0 0 2px rgba(255, 255, 255, 0.4), 0 8px 25px rgba(0, 0, 0, 0.1)"
            : "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      />

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div style={{
          position: "absolute",
          top: "120%",
          left: 0,
          right: 0,
          background: colors.background,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${colors.borderColor}`,
          borderRadius: "16px",
          boxShadow: colors.shadow,
          zIndex: 1001,
          maxHeight: "300px", // Reduced from 400px
          overflow: "hidden",
          color: colors.textColor
        }}>
          {filteredMotors.length === 0 ? (
            <div style={{
              padding: "16px", // Reduced from 20px
              textAlign: "center",
              color: colors.textColor,
              opacity: 0.7
            }}>
              {searchTerm.trim() ? (
                <>
                  <FaSearch style={{ fontSize: "20px", marginBottom: "6px" }} /> {/* Reduced from 24px */}
                  <p style={{ margin: 0, fontSize: "13px" }}>No motors found</p> {/* Reduced from 14px */}
                  <p style={{ margin: "3px 0 0 0", fontSize: "11px" }}> {/* Reduced from 12px */}
                    Try searching by motor name, ID, or location
                  </p>
                </>
              ) : (
                <>
                  <FaCog style={{ fontSize: "20px", marginBottom: "6px" }} /> {/* Reduced from 24px */}
                  <p style={{ margin: 0, fontSize: "13px" }}>Start typing to search motors</p> {/* Reduced from 14px */}
                </>
              )}
            </div>
          ) : (
            <div style={{ maxHeight: "250px", overflowY: "auto" }}> {/* Reduced from 350px */}
              {filteredMotors.map((motor) => (
                <div
                  key={motor.id}
                  onClick={() => handleMotorSelect(motor)}
                  style={{
                    padding: "12px 16px", // Reduced from 16px 20px
                    borderBottom: `1px solid ${colors.borderColor}`,
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px" // Reduced from 12px
                  }}
                  onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  {/* Motor Icon - Smaller */}
                  <div style={{
                    width: "32px", // Reduced from 40px
                    height: "32px", // Reduced from 40px
                    borderRadius: "6px", // Reduced from 8px
                    background: "rgba(59, 130, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3b82f6",
                    flexShrink: 0
                  }}>
                    <FaCog style={{ fontSize: "14px" }} /> {/* Reduced from default */}
                  </div>

                  {/* Motor Info - Positioned at the right */}
                  <div style={{ 
                    flex: 1, 
                    textAlign: "right", // Align text to the right
                    marginLeft: "auto" // Push to the far right
                  }}>
                    <div style={{
                      fontWeight: "600",
                      fontSize: "13px", // Reduced from 14px
                      marginBottom: "2px", // Reduced from 4px
                      color: colors.textColor
                    }}>
                      {motor.name}
                    </div>
                    <div style={{
                      fontSize: "11px", // Reduced from 12px
                      color: colors.textColor,
                      opacity: 0.7,
                      marginBottom: "2px", // Reduced from 4px
                      display: "flex",
                      alignItems: "center",
                      gap: "3px", // Reduced from 4px
                      justifyContent: "flex-end" // Align to the right
                    }}>
                      <FaMapMarkerAlt style={{ fontSize: "9px" }} /> {/* Reduced from 10px */}
                      {motor.location}
                    </div>
                    <div style={{
                      fontSize: "10px", // Reduced from 11px
                      color: colors.textColor,
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px", // Reduced from 8px
                      justifyContent: "flex-end" // Align to the right
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <FaThermometerHalf style={{ fontSize: "7px" }} /> {/* Reduced from 8px */}
                        {motor.temperature ? UnitConverter.formatTemperature(motor.temperature, displayPreferences.temperatureUnit) : 'N/A'}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <FaWaveSquare style={{ fontSize: "7px" }} /> {/* Reduced from 8px */}
                        {motor.vibration ? UnitConverter.formatVibration(motor.vibration, displayPreferences.vibrationUnit) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Status - Smaller and positioned at the far right */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px", // Reduced from 4px
                    marginLeft: "8px", // Add some space from motor info
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: "6px", // Reduced from 8px
                      height: "6px", // Reduced from 8px
                      borderRadius: "50%",
                      background: getStatusColor(motor.status)
                    }} />
                    <span style={{
                      fontSize: "9px", // Reduced from 10px
                      color: colors.textColor,
                      opacity: 0.8,
                      fontWeight: "500"
                    }}>
                      {getStatusText(motor.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {filteredMotors.length > 0 && (
            <div style={{
              padding: "12px 20px",
              borderTop: `1px solid ${colors.borderColor}`,
              fontSize: "12px",
              color: colors.textColor,
              opacity: 0.7,
              textAlign: "center"
            }}>
              {filteredMotors.length} motor{filteredMotors.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      )}

      {/* Search Results Indicator */}
      {searchTerm && !showDropdown && (
        <div style={{
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255, 255, 255, 0.2)",
          color: colors.textColor,
          padding: "4px 8px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "500",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
          {filteredMotors.length} result{filteredMotors.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown; 