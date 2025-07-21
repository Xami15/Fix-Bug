import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaSignOutAlt, FaFileCsv, FaFilePdf, FaTrashAlt } from "react-icons/fa";
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
    // Simulate export (replace with real logic if needed)
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

  return (
    <div className="settings-page" style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
      <header className="settings-header" style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontWeight: 700, fontSize: "2rem", marginBottom: "0.5rem" }}>Settings</h1>
      </header>

      <main className="settings-main" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* User Profile Card */}
        <section className="settings-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>User Profile</h2>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="profilePicInput" style={{ cursor: "pointer" }}>
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="profile-pic-img"
                  style={{
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #2563eb",
                  }}
                />
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "var(--secondary-bg-color)",
                    border: "2px dashed var(--border-color)",
                  }}
                >
                  <FaCamera style={{ fontSize: "2.5rem", color: "#2563eb" }} />
                </span>
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
          <div style={{ fontSize: "1rem", color: "var(--secondary-text-color)" }}>
            <span>Logged in as <strong>{localStorage.getItem("userEmail") || "User"}</strong></span>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="settings-card" style={{ padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>Notification Preferences</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                className="settings-checkbox"
                type="checkbox"
                checked={emailAlerts}
                onChange={() => setEmailAlerts(!emailAlerts)}
              />
              Email alerts (faults, warnings)
            </label>
            <label className="settings-label" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                className="settings-checkbox"
                type="checkbox"
                checked={smsPushNotifications}
                onChange={() => setSmsPushNotifications(!smsPushNotifications)}
              />
              SMS / Push Notifications
            </label>
          </div>
        </section>

        {/* Display Preferences */}
        <section className="settings-card" style={{ padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>Display Preferences</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              Temperature Unit:
              <select
                className="settings-input"
                value={temperatureUnit}
                onChange={(e) => setTemperatureUnit(e.target.value)}
                style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              >
                <option value="°C">°C</option>
                <option value="°F">°F</option>
              </select>
            </label>
            <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              Vibration Unit:
              <select
                className="settings-input"
                value={vibrationUnit}
                onChange={(e) => setVibrationUnit(e.target.value)}
                style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              >
                <option value="m/s²">m/s²</option>
                <option value="g">g</option>
              </select>
            </label>
          </div>
        </section>

        {/* Sensor/Device Settings */}
        <section className="settings-card" style={{ padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>Sensor/Device Settings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              Temperature Alert Threshold ({temperatureUnit}):
              <input
                className="settings-input"
                type="number"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                min={-50}
                max={150}
                style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              Vibration Alert Threshold ({vibrationUnit}):
              <input
                className="settings-input"
                type="number"
                value={vibrationThreshold}
                onChange={(e) => setVibrationThreshold(Number(e.target.value))}
                min={0}
                max={100}
                style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
            <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              Calibration Value:
              <input
                className="settings-input"
                type="number"
                value={calibrationValue}
                onChange={(e) => setCalibrationValue(Number(e.target.value))}
                min={-100}
                max={100}
                style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}
              />
            </label>
          </div>
        </section>

        {/* Data Settings */}
        <section className="settings-card" style={{ padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>Data Settings</h2>
          <label className="settings-label" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            Data Retention Period (Months):
            <input
              className="settings-input"
              type="number"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              min={1}
              max={120}
              style={{ marginTop: "0.25rem", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
            />
          </label>
          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              className="settings-button"
              onClick={() => handleExportData("CSV")}
              type="button"
              title="Export as CSV"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0.5rem 1.25rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FaFileCsv /> CSV
            </button>
            <button
              className="settings-button"
              onClick={() => handleExportData("PDF")}
              type="button"
              title="Export as PDF"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#374151",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0.5rem 1.25rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FaFilePdf /> PDF
            </button>
          </div>
        </section>

        {/* Account Management */}
        <section className="settings-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <h2 style={{ fontWeight: 600, fontSize: "1.25rem", marginBottom: "1rem" }}>Account Management</h2>
          <button
            className="settings-button"
            onClick={handleLogout}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: "0 auto 1rem auto",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.5rem 1.25rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FaSignOutAlt /> Log Out
          </button>
          <button
            className={`settings-button settings-confirm-button ${confirmDelete ? "confirm-active" : ""}`}
            onClick={handleDeleteAccount}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: "0 auto",
              background: confirmDelete ? "#e11d48" : "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.5rem 1.25rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <FaTrashAlt />
            {confirmDelete ? "Click again to Confirm Delete" : "Delete Account"}
          </button>
        </section>
      </main>
    </div>
  );
}
