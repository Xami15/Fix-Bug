import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// Removed: import { useTheme } from "../context/ThemeContext"; // Theme import removed
import "./Settings.css";

export default function Settings() {
  // Removed: const { theme } = useTheme(); // Theme context usage removed
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profilePic, setProfilePic] = useState(null);

  const [emailAlerts, setEmailAlerts] = useState(false);
  const [smsPushNotifications, setSmsPushNotifications] = useState(false);

  const [temperatureUnit, setTemperatureUnit] = useState("°C");
  const [vibrationUnit, setVibrationUnit] = useState("m/s²");

  const [tempThreshold, setTempThreshold] = useState(30);
  const [vibrationThreshold, setVibrationThreshold] = useState(5);
  const [calibrationValue, setCalibrationValue] = useState(0);
  const [dataRetentionDays, setDataRetentionDays] = useState(30);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportData = (format) => {
    // Replaced alert() with console.log as alerts are not allowed in Canvas
    console.log(`Exporting data as ${format}... (functionality not implemented)`);
    // In a real app, you'd show a custom modal or toast notification here.
  };

  const handleLogout = () => {
    // Optionally clear user/session data here
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login"); // ✅ Go to LoginSignup
  };

  const handleDeleteAccount = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      // Replaced alert() with console.log as alerts are not allowed in Canvas
      console.log("Account deleted! (functionality not implemented)");
      // In a real app, you'd show a custom modal or toast notification here.
      setConfirmDelete(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
      </header>

      <main className="settings-main">
        <section className="settings-card">
          <h2>User Profile</h2>
          <label className="settings-label">
            Name
            <input
              className="settings-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="settings-label">
            Email
            <input
              className="settings-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="settings-label">
            Password
            <input
              className="settings-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="settings-label">
            Profile Picture
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              style={{ marginTop: 6 }}
            />
          </label>

          {profilePic && (
            <img
              src={profilePic}
              alt="Profile Preview"
              className="profile-pic-img"
            />
          )}
        </section>

        <section className="settings-card">
          <h2>Notification Preferences</h2>
          <label className="settings-label">
            <input
              className="settings-checkbox"
              type="checkbox"
              checked={emailAlerts}
              onChange={() => setEmailAlerts(!emailAlerts)}
            />
            Email alerts (faults, warnings)
          </label>

          <label className="settings-label">
            <input
              className="settings-checkbox"
              type="checkbox"
              checked={smsPushNotifications}
              onChange={() => setSmsPushNotifications(!smsPushNotifications)}
            />
            SMS / Push Notifications
          </label>
        </section>

        <section className="settings-card">
          <h2>Display Preferences</h2>
          {/* Note: The theme toggle functionality was handled elsewhere.
              These settings are for units, not global theme. */}
          <label className="settings-label">
            Temperature Unit:
            <select
              className="settings-input"
              value={temperatureUnit}
              onChange={(e) => setTemperatureUnit(e.target.value)}
            >
              <option value="°C">°C</option>
              <option value="°F">°F</option>
            </select>
          </label>

          <label className="settings-label">
            Vibration Unit:
            <select
              className="settings-input"
              value={vibrationUnit}
              onChange={(e) => setVibrationUnit(e.target.value)}
            >
              <option value="m/s²">m/s²</option>
              <option value="g">g</option>
            </select>
          </label>
        </section>

        <section className="settings-card">
          <h2>Sensor/Device Settings</h2>
          <label className="settings-label">
            Temperature Alert Threshold ({temperatureUnit}):
            <input
              className="settings-input"
              type="number"
              value={tempThreshold}
              onChange={(e) => setTempThreshold(Number(e.target.value))}
            />
          </label>

          <label className="settings-label">
            Vibration Alert Threshold ({vibrationUnit}):
            <input
              className="settings-input"
              type="number"
              value={vibrationThreshold}
              onChange={(e) => setVibrationThreshold(Number(e.target.value))}
            />
          </label>

          <label className="settings-label">
            Calibration Value:
            <input
              className="settings-input"
              type="number"
              value={calibrationValue}
              onChange={(e) => setCalibrationValue(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="settings-card">
          <h2>Data Settings</h2>
          <label className="settings-label">
            Data Retention Period (Months):
            <input
              className="settings-input"
              type="number"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
            />
          </label>

          <div>
            Export Data:
            <button
              className="settings-button"
              onClick={() => handleExportData("CSV")}
              type="button"
            >
              CSV
            </button>
            <button
              className="settings-button"
              onClick={() => handleExportData("PDF")}
              type="button"
            >
              PDF
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>Account Management</h2>
          <button className="settings-button" onClick={handleLogout} type="button">
            Log Out
          </button>

          <button
            className={`settings-button settings-confirm-button ${confirmDelete ? "confirm-active" : ""}`}
            onClick={handleDeleteAccount}
            type="button"
          >
            {confirmDelete ? "Click again to Confirm Delete" : "Delete Account"}
          </button>
        </section>
      </main>
    </div>
  );
}
