import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaSignOutAlt,
  FaFileCsv,
  FaFilePdf,
  FaTrashAlt,
  FaUserCircle,
  FaBell,
  FaThermometerHalf,
  FaDatabase,
  FaCogs,
  FaEnvelope,
  FaPhoneAlt,
  FaCalendarAlt,
  FaMinusCircle,
  FaPaperPlane,
  FaSave
} from "react-icons/fa";
import "./Settings.css";

export default function Settings() {
  const navigate = useNavigate();

  // Profile states
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem("profilePic") || "");

  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("emailAlerts") === "true");
  const [smsPushNotifications, setSmsPushNotifications] = useState(() => localStorage.getItem("smsPushNotifications") === "true");

  // State for individual email/phone input
  const [newNotificationEmail, setNewNotificationEmail] = useState("");
  const [newNotificationPhone, setNewNotificationPhone] = useState("");

  // Notification contact details to allow multiple (stored as JSON string in localStorage)
  const [notificationEmails, setNotificationEmails] = useState(() => {
    const storedEmails = localStorage.getItem("notificationEmails");
    return storedEmails ? JSON.parse(storedEmails) : [];
  });
  const [notificationPhones, setNotificationPhones] = useState(() => {
    const storedPhones = localStorage.getItem("notificationPhones");
    return storedPhones ? JSON.parse(storedPhones) : [];
  });

  // Sensor/device settings
  const [temperatureUnit, setTemperatureUnit] = useState(() => localStorage.getItem("temperatureUnit") || "°C");
  const [vibrationUnit, setVibrationUnit] = useState(() => localStorage.getItem("vibrationUnit") || "m/s²");
  const [tempThreshold, setTempThreshold] = useState(() => Number(localStorage.getItem("tempThreshold")) || 30);
  const [vibrationThreshold, setVibrationThreshold] = useState(() => Number(localStorage.getItem("vibrationThreshold")) || 5);
  const [calibrationValue, setCalibrationValue] = useState(() => Number(localStorage.getItem("calibrationValue")) || 0);

  // Data settings
  const [dataRetentionDays, setDataRetentionDays] = useState(() => Number(localStorage.getItem("dataRetentionDays")) || 30);

  // Reporting & Export Schedules states
  const [enableScheduledReports, setEnableScheduledReports] = useState(() => localStorage.getItem("enableScheduledReports") === "true");
  const [reportFrequency, setReportFrequency] = useState(() => localStorage.getItem("reportFrequency") || "weekly");

  // Account management
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Notification Contact Management Functions ---

  const handleAddEmail = () => {
    if (newNotificationEmail && !notificationEmails.includes(newNotificationEmail)) {
      setNotificationEmails([...notificationEmails, newNotificationEmail]);
      setNewNotificationEmail(""); // Clear input after adding
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setNotificationEmails(notificationEmails.filter(email => email !== emailToRemove));
  };

  const handleAddPhone = () => {
    if (newNotificationPhone && !notificationPhones.includes(newNotificationPhone)) {
      setNotificationPhones([...notificationPhones, newNotificationPhone]);
      setNewNotificationPhone(""); // Clear input after adding
    }
  };

  const handleRemovePhone = (phoneToRemove) => {
    setNotificationPhones(notificationPhones.filter(phone => phone !== phoneToRemove));
  };

  // --- Send Test Notifications ---

  const handleSendTestEmail = () => {
    if (notificationEmails.length > 0) {
      alert(`Simulated: Test email sent to ${notificationEmails.join(', ')}! Please check your inbox.`);
      console.log(`Sending test email to: ${notificationEmails.join(', ')}`);
      // In a real app, you would make an API call here to send the test email
    } else {
      alert("Please add at least one email address to send a test notification.");
    }
  };

  const handleSendTestSMS = () => {
    if (notificationPhones.length > 0) {
      alert(`Simulated: Test SMS sent to ${notificationPhones.join(', ')}! Please check your phone.`);
      console.log(`Sending test SMS to: ${notificationPhones.join(', ')}`);
      // In a real app, you would make an API call here to send the test SMS
    } else {
      alert("Please add at least one phone number to send a test notification.");
    }
  };

  // --- Existing Functions ---

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

  const handleExportData = (format) => {
    console.log(`Exporting data as ${format}...`);
    alert(`Exporting data as ${format}! (Simulated action)`);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  const handleDeleteAccount = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      localStorage.clear();
      sessionStorage.clear();
      console.log("Account deleted! (functionality not implemented)");
      alert("Account deleted!");
      navigate("/login");
    }
  };

  const handleSaveChanges = () => {
    localStorage.setItem("emailAlerts", emailAlerts);
    localStorage.setItem("smsPushNotifications", smsPushNotifications);
    // Store arrays as JSON strings
    localStorage.setItem("notificationEmails", JSON.stringify(notificationEmails));
    localStorage.setItem("notificationPhones", JSON.stringify(notificationPhones));

    localStorage.setItem("temperatureUnit", temperatureUnit);
    localStorage.setItem("vibrationUnit", vibrationUnit);
    localStorage.setItem("tempThreshold", tempThreshold);
    localStorage.setItem("vibrationThreshold", vibrationThreshold);
    localStorage.setItem("calibrationValue", calibrationValue);
    localStorage.setItem("dataRetentionDays", dataRetentionDays);

    localStorage.setItem("enableScheduledReports", enableScheduledReports);
    localStorage.setItem("reportFrequency", reportFrequency);

    alert("Settings saved!");
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1><FaCogs className="header-icon" /> Settings</h1>
      </header>

      <main className="settings-main-content">
        {/* User Profile Card */}
        <section className="settings-card profile-section">
          <h2><FaUserCircle className="section-icon" /> User Profile</h2>
          <div className="profile-pic-area">
            <label htmlFor="profilePicInput" className="profile-pic-label">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-pic-img" />
              ) : (
                <span className="profile-pic-placeholder">
                  <FaCamera className="camera-icon" />
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
          <p className="user-email-display">Logged in as: <strong>{localStorage.getItem("userEmail") || "user@example.com"}</strong></p>
        </section>

        {/* Notification Preferences */}
        <section className="settings-card notifications-section">
          <h2><FaBell className="section-icon" /> Notification Preferences</h2>

          {/* Email Alerts */}
          <div className="setting-item switch-container">
            <label htmlFor="emailAlertsToggle" className="settings-label switch-label">
              Enable Email Alerts
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="emailAlertsToggle"
                checked={emailAlerts}
                onChange={() => setEmailAlerts(!emailAlerts)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item email-list-control">
            <label className="settings-label">
              <FaEnvelope className="input-icon" /> Notification Email:
            </label>
            <div className="input-and-add-container">
              <button className="add-button" onClick={handleAddEmail} type="button" title="Add Email">
                ADD
              </button>
              <input
                className="settings-input"
                type="email"
                value={newNotificationEmail}
                onChange={(e) => setNewNotificationEmail(e.target.value)}
                placeholder="e.g., your_email@example.com"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
              />
            </div>
            <ul className="contact-list">
              {notificationEmails.map((email, index) => (
                <li key={index}>
                  {email}
                  <button onClick={() => handleRemoveEmail(email)} className="remove-button" type="button" title="Remove Email">
                    <FaMinusCircle />
                  </button>
                </li>
              ))}
            </ul>
            <button className="settings-button secondary-button test-notification-button" onClick={handleSendTestEmail} type="button">
              <FaPaperPlane /> Send Test Email
            </button>
          </div>

          {/* SMS/Push Notifications */}
          <div className="setting-item switch-container">
            <label htmlFor="smsPushNotificationsToggle" className="settings-label switch-label">
              Enable SMS / Push Notifications
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="smsPushNotificationsToggle"
                checked={smsPushNotifications}
                onChange={() => setSmsPushNotifications(!smsPushNotifications)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item phone-list-control">
            <label className="settings-label">
              <FaPhoneAlt className="input-icon" /> Notification Phone:
            </label>
            <div className="input-and-add-container">
              <button className="add-button" onClick={handleAddPhone} type="button" title="Add Phone">
                ADD
              </button>
              <input
                className="settings-input"
                type="tel"
                value={newNotificationPhone}
                onChange={(e) => setNewNotificationPhone(e.target.value)}
                placeholder="e.g., +15551234567"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPhone(); } }}
              />
            </div>
            <ul className="contact-list">
              {notificationPhones.map((phone, index) => (
                <li key={index}>
                  {phone}
                  <button onClick={() => handleRemovePhone(phone)} className="remove-button" type="button" title="Remove Phone">
                    <FaMinusCircle />
                  </button>
                </li>
              ))}
            </ul>
            <button className="settings-button secondary-button test-notification-button" onClick={handleSendTestSMS} type="button">
              <FaPaperPlane /> Send Test SMS
            </button>
          </div>
        </section>

        {/* Reporting & Export Schedules */}
        <section className="settings-card reporting-schedules-section">
          <h2><FaCalendarAlt className="section-icon" /> Reporting & Export Schedules</h2>
          <div className="setting-item switch-container">
            <label htmlFor="enableScheduledReportsToggle" className="settings-label switch-label">
              Enable Scheduled Reports
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="enableScheduledReportsToggle"
                checked={enableScheduledReports}
                onChange={() => setEnableScheduledReports(!enableScheduledReports)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="setting-item">
            <label className="settings-label">
              Report Frequency:
              <select
                className="settings-input"
                value={reportFrequency}
                onChange={(e) => setReportFrequency(e.target.value)}
                disabled={!enableScheduledReports}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </section>

        {/* Sensor/Device Settings */}
        <section className="settings-card sensor-device-section">
          <h2><FaThermometerHalf className="section-icon" /> Sensor/Device Settings</h2>
          <div className="setting-item">
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
          </div>
          <div className="setting-item">
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
          </div>
          <div className="setting-item">
            <label className="settings-label">
              Temperature Alert Threshold ({temperatureUnit}):
              <input
                className="settings-input"
                type="number"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                min={-50}
                max={150}
              />
            </label>
          </div>
          <div className="setting-item">
            <label className="settings-label">
              Vibration Alert Threshold ({vibrationUnit}):
              <input
                className="settings-input"
                type="number"
                value={vibrationThreshold}
                onChange={(e) => setVibrationThreshold(Number(e.target.value))}
                min={0}
                max={100}
              />
            </label>
          </div>
          <div className="setting-item">
            <label className="settings-label">
              Calibration Value:
              <input
                className="settings-input"
                type="number"
                value={calibrationValue}
                onChange={(e) => setCalibrationValue(Number(e.target.value))}
                min={-100}
                max={100}
              />
            </label>
          </div>
        </section>

        {/* Data Settings */}
        <section className="settings-card data-settings-section">
          <h2><FaDatabase className="section-icon" /> Data Settings</h2>
          <div className="setting-item">
            <label className="settings-label">
              Data Retention Period (Months):
              <input
                className="settings-input"
                type="number"
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                min={1}
                max={120}
              />
            </label>
          </div>
          <div className="data-export-buttons">
            <button className="settings-button primary-button" onClick={() => handleExportData("CSV")} type="button" title="Export as CSV">
              <FaFileCsv /> Export CSV
            </button>
            <button className="settings-button secondary-button" onClick={() => handleExportData("PDF")} type="button" title="Export as PDF">
              <FaFilePdf /> Export PDF
            </button>
          </div>
        </section>

        {/* Account Management Card */}
        <section className="settings-card account-management-section">
          <h2>Account Actions</h2>
          <div className="account-buttons">
            <button className="settings-button primary-button" onClick={handleLogout} type="button">
              <FaSignOutAlt /> Log Out
            </button>
            <button
              className={`settings-button delete-button ${confirmDelete ? "confirm-active" : ""}`}
              onClick={handleDeleteAccount}
              type="button"
            >
              {confirmDelete ? "Click again to Confirm" : <><FaTrashAlt /> Delete Account</>}
            </button>
          </div>
        </section>

        {/* Save Changes Button */}
        <section className="settings-card save-changes-section">
          <button className="settings-button primary-button large-button" onClick={handleSaveChanges} type="button">
            <FaSave /> Save Changes
          </button>
        </section>
      </main>
    </div>
  );
}