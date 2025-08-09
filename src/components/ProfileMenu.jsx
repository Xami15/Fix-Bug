import React, { useState, useContext } from 'react';
import { FaUserCircle, FaSignOutAlt, FaCog, FaCamera, FaUser, FaShieldAlt, FaMoon, FaSun } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const ProfileMenu = ({ darkMode }) => {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('profilePic') || '');
  const [name, setName] = useState(() => localStorage.getItem('userName') || 'User');
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || 'user@example.com');
  const navigate = useNavigate();
  const { theme, cycleTheme } = useContext(ThemeContext);

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          accentColor: "#3b82f6"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.95)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
          accentColor: "#60a5fa"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
          accentColor: "#60a5fa"
        };
      default:
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          accentColor: "#3b82f6"
        };
    }
  };

  const colors = getThemeColors();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const handleProfileSettings = () => {
    setShowSettings(true);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem('profilePic', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    setShowSettings(false);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    // Reset form to current values
    setName(localStorage.getItem('userName') || 'User');
    setEmail(localStorage.getItem('userEmail') || 'user@example.com');
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Profile Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          padding: "8px 12px",
          borderRadius: "12px",
          border: "none",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          color: "inherit",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          fontWeight: "500",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
          e.target.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.1)";
          e.target.style.transform = "translateY(0)";
        }}
        aria-label="Profile menu"
      >
        {profilePic ? (
          <img
            src={profilePic}
            alt="Profile"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${colors.accentColor}`,
            }}
          />
        ) : (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold"
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: "14px" }}>{name}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {/* Profile Dropdown */}
      {open && !showSettings && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            background: colors.background,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${colors.borderColor}`,
            borderRadius: "16px",
            minWidth: 240,
            zIndex: 1001,
            boxShadow: colors.shadow,
            overflow: "hidden",
            color: colors.textColor
          }}
        >
          {/* User Info Header */}
          <div style={{
            padding: "20px",
            borderBottom: `1px solid ${colors.borderColor}`,
            textAlign: "center"
          }}>
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${colors.accentColor}`,
                  marginBottom: "12px"
                }}
              />
            ) : (
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: colors.accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "24px",
                fontWeight: "bold",
                margin: "0 auto 12px auto"
              }}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "4px" }}>
              {name}
            </div>
            <div style={{ fontSize: "14px", opacity: 0.7 }}>
              {email}
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: "8px" }}>
            <button
              onClick={handleProfileSettings}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "inherit",
                borderRadius: "8px",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              <FaUser style={{ fontSize: "16px", color: colors.accentColor }} />
              Profile Settings
            </button>

            <button
                              onClick={cycleTheme}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "inherit",
                borderRadius: "8px",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              {darkMode ? (
                <FaSun style={{ fontSize: "16px", color: "#f59e0b" }} />
              ) : (
                <FaMoon style={{ fontSize: "16px", color: "#6366f1" }} />
              )}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={() => navigate('/settings')}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "inherit",
                borderRadius: "8px",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              <FaCog style={{ fontSize: "16px", color: "#6b7280" }} />
              Settings
            </button>

            <div style={{ 
              height: "1px", 
              background: colors.borderColor, 
              margin: "8px 16px" 
            }} />

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#ef4444",
                borderRadius: "8px",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(239, 68, 68, 0.1)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              <FaSignOutAlt style={{ fontSize: "16px" }} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {open && showSettings && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            background: colors.background,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${colors.borderColor}`,
            borderRadius: "16px",
            minWidth: 280,
            zIndex: 1001,
            boxShadow: colors.shadow,
            overflow: "hidden",
            color: colors.textColor
          }}
        >
          <div style={{
            padding: "20px",
            borderBottom: `1px solid ${colors.borderColor}`
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px"
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                Profile Settings
              </h3>
              <button
                onClick={handleSettingsClose}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textColor,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  fontSize: "16px"
                }}
                onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: colors.textColor,
                  opacity: 0.8
                }}>
                  Profile Picture
                </label>
                <div style={{ textAlign: "center" }}>
                  <label htmlFor="profilePicInput" style={{ cursor: "pointer" }}>
                    {profilePic ? (
                      <img
                        src={profilePic}
                        alt="Profile Preview"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: `3px solid ${colors.accentColor}`,
                          cursor: "pointer"
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        background: colors.accentColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "24px",
                        cursor: "pointer"
                      }}>
                        <FaCamera />
                      </div>
                    )}
                  </label>
                  <input
                    id="profilePicInput"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: colors.textColor,
                  opacity: 0.8
                }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.borderColor}`,
                    background: "rgba(255, 255, 255, 0.1)",
                    color: colors.textColor,
                    fontSize: "14px",
                    outline: "none"
                  }}
                  placeholder="Enter your name"
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: colors.textColor,
                  opacity: 0.8
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.borderColor}`,
                    background: "rgba(255, 255, 255, 0.1)",
                    color: colors.textColor,
                    fontSize: "14px",
                    outline: "none"
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleSettingsClose}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.borderColor}`,
                    background: "transparent",
                    color: colors.textColor,
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: colors.accentColor,
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#2563eb"}
                  onMouseLeave={(e) => e.target.style.background = colors.accentColor}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfileMenu;