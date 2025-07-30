import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaSignOutAlt, FaFileCsv, FaFilePdf, FaTrashAlt, FaBell, FaEye, FaCog, FaDatabase, FaUser, FaLock } from "react-icons/fa";
import "./Settings.css";

export default function Settings() {
  const navigate = useNavigate();

  // Profile states
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem("profilePic") || "");
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [smsPushNotifications, setSmsPushNotifications] = useState(false);

  // Display preferences
  const [temperatureUnit, setTemperatureUnit] = useState("°C");
  const [vibrationUnit, setVibrationUnit] = useState("m/s²");

  // Sensor/device settings
  const [tempThreshold, setTempThreshold] = useState(30);
  const [vibrationThreshold, setVibrationThreshold] = useState(5);
  const [calibrationValue, setCalibrationValue] = useState(0);

  // Data settings
  const [dataRetentionDays, setDataRetentionDays] = useState(30);

  // Account management
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Handle profile picture upload
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem("profilePic", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Export data (CSV/PDF)
  const handleExportData = (format) => {
    console.log(`Exporting data as ${format}...`);
  };

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  // Delete account (simulated)
  const handleDeleteAccount = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      localStorage.clear();
      sessionStorage.clear();
      console.log("Account deleted! (functionality not implemented)");
      navigate("/login");
    }
  };

  const settingsCards = [
    {
      id: 'profile',
      title: 'User Profile',
      icon: <FaUser />,
      content: (
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "2rem" }}>
            <label htmlFor="profilePicInput" style={{ cursor: "pointer" }}>
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "4px solid #3b82f6",
                    boxShadow: "0 8px 32px rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    border: "3px dashed rgba(59, 130, 246, 0.4)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <FaCamera style={{ fontSize: "2.5rem", color: "#ffffff" }} />
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
          <div style={{ 
            fontSize: "1.1rem", 
            color: "var(--secondary-text-color)",
            background: "rgba(59, 130, 246, 0.1)",
            padding: "1rem",
            borderRadius: "12px",
            border: "1px solid rgba(59, 130, 246, 0.2)"
          }}>
            <span>Logged in as</span>
            <br />
            <strong style={{ color: "var(--text-color)", fontSize: "1.2rem" }}>
              {localStorage.getItem("userEmail") || "User"}
            </strong>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notification Preferences',
      icon: <FaBell />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem",
            padding: "1rem",
            borderRadius: "12px",
            background: emailAlerts ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
            border: `2px solid ${emailAlerts ? "rgba(34, 197, 94, 0.3)" : "rgba(156, 163, 175, 0.2)"}`,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={() => setEmailAlerts(!emailAlerts)}
              style={{ 
                width: "20px", 
                height: "20px", 
                accentColor: "#22c55e",
                cursor: "pointer"
              }}
            />
            <div>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Email Alerts</div>
              <div style={{ fontSize: "0.9rem", color: "var(--secondary-text-color)" }}>
                Receive notifications for faults and warnings
              </div>
            </div>
          </label>
          
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem",
            padding: "1rem",
            borderRadius: "12px",
            background: smsPushNotifications ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
            border: `2px solid ${smsPushNotifications ? "rgba(34, 197, 94, 0.3)" : "rgba(156, 163, 175, 0.2)"}`,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}>
            <input
              type="checkbox"
              checked={smsPushNotifications}
              onChange={() => setSmsPushNotifications(!smsPushNotifications)}
              style={{ 
                width: "20px", 
                height: "20px", 
                accentColor: "#22c55e",
                cursor: "pointer"
              }}
            />
            <div>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>SMS & Push Notifications</div>
              <div style={{ fontSize: "0.9rem", color: "var(--secondary-text-color)" }}>
                Get instant mobile notifications
              </div>
            </div>
          </label>
        </div>
      )
    },
    {
      id: 'display',
      title: 'Display Preferences',
      icon: <FaEye />,
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Temperature Unit
            </label>
            <select
              value={temperatureUnit}
              onChange={(e) => setTemperatureUnit(e.target.value)}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              <option value="°C">Celsius (°C)</option>
              <option value="°F">Fahrenheit (°F)</option>
            </select>
          </div>
          
          <div>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Vibration Unit
            </label>
            <select
              value={vibrationUnit}
              onChange={(e) => setVibrationUnit(e.target.value)}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              <option value="m/s²">m/s²</option>
              <option value="g">g</option>
            </select>
          </div>
        </div>
      )
    },
    {
      id: 'sensors',
      title: 'Sensor & Device Settings',
      icon: <FaCog />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Temperature Alert Threshold ({temperatureUnit})
            </label>
            <input
              type="number"
              value={tempThreshold}
              onChange={(e) => setTempThreshold(Number(e.target.value))}
              min={-50}
              max={150}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Vibration Alert Threshold ({vibrationUnit})
            </label>
            <input
              type="number"
              value={vibrationThreshold}
              onChange={(e) => setVibrationThreshold(Number(e.target.value))}
              min={0}
              max={100}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Calibration Value
            </label>
            <input
              type="number"
              value={calibrationValue}
              onChange={(e) => setCalibrationValue(Number(e.target.value))}
              min={-100}
              max={100}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </div>
        </div>
      )
    },
    {
      id: 'data',
      title: 'Data Management',
      icon: <FaDatabase />,
      content: (
        <div>
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ 
              display: "block", 
              fontWeight: "600", 
              marginBottom: "0.75rem",
              color: "var(--text-color)"
            }}>
              Data Retention Period (Months)
            </label>
            <input
              type="number"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              min={1}
              max={120}
              style={{ 
                width: "100%",
                padding: "0.75rem 1rem", 
                borderRadius: "12px", 
                border: "2px solid rgba(59, 130, 246, 0.2)",
                background: "rgba(59, 130, 246, 0.05)",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "1rem",
            padding: "1.5rem",
            background: "rgba(59, 130, 246, 0.05)",
            borderRadius: "16px",
            border: "1px solid rgba(59, 130, 246, 0.1)"
          }}>
            <button
              onClick={() => handleExportData("CSV")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "1rem 1.5rem",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(34, 197, 94, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3)";
              }}
            >
              <FaFileCsv size={18} /> Export CSV
            </button>
            
            <button
              onClick={() => handleExportData("PDF")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "1rem 1.5rem",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
              }}
            >
              <FaFilePdf size={18} /> Export PDF
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'account',
      title: 'Account Management',
      icon: <FaLock />,
      content: (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              margin: "0 auto",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "1rem 2rem",
              fontWeight: "600",
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
            }}
          >
            <FaSignOutAlt size={18} /> Log Out
          </button>
          
          <button
            onClick={handleDeleteAccount}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              margin: "0 auto",
              background: confirmDelete ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #6b7280, #4b5563)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "1rem 2rem",
              fontWeight: "600",
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: confirmDelete ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(107, 114, 128, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = confirmDelete ? "0 8px 25px rgba(239, 68, 68, 0.4)" : "0 8px 25px rgba(107, 114, 128, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = confirmDelete ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(107, 114, 128, 0.3)";
            }}
          >
            <FaTrashAlt size={18} />
            {confirmDelete ? "Click again to Confirm Delete" : "Delete Account"}
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: "2rem"
    }}>
      {/* Hero Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "3rem",
        padding: "2rem",
        background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        borderRadius: "24px",
        color: "white",
        boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)"
      }}>
        <h1 style={{ 
          fontSize: "3rem", 
          fontWeight: "800", 
          marginBottom: "0.5rem",
          background: "linear-gradient(135deg, #ffffff, #e2e8f0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          Settings
        </h1>
        <p style={{ 
          fontSize: "1.2rem", 
          opacity: 0.9, 
          fontWeight: "400",
          maxWidth: "600px",
          margin: "0 auto"
        }}>
          Customize your experience and manage your account preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "2rem",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        {settingsCards.map((card) => (
          <div
            key={card.id}
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1)";
            }}
          >
            {/* Card Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "2rem",
              paddingBottom: "1rem",
              borderBottom: "2px solid rgba(59, 130, 246, 0.1)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                borderRadius: "12px",
                color: "white",
                fontSize: "1.5rem"
              }}>
                {card.icon}
              </div>
              <h2 style={{ 
                fontSize: "1.5rem", 
                fontWeight: "700", 
                color: "var(--text-color)",
                margin: 0
              }}>
                {card.title}
              </h2>
            </div>

            {/* Card Content */}
            <div>
              {card.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}