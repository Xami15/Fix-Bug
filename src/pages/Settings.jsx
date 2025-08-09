import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useMotors } from "../context/MotorsContext";
import { ThemeContext } from "../context/ThemeContext";
import { notificationService } from "../services/notificationService";
import UnitConverter from '../utils/unitConverter';
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
  FaSave,
  FaPlus
} from "react-icons/fa";
import "./Settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const { addEmailNotification, addSMSNotification } = useNotifications();
  const { motors, historyData } = useMotors();
  const { theme } = useContext(ThemeContext);

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
  const [displayPreferences, setDisplayPreferences] = useState(() => {
    const saved = localStorage.getItem("displayPreferences");
    return saved ? JSON.parse(saved) : {
      temperatureUnit: "C",
      vibrationUnit: "m/s²"
    };
  });
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

  // Export loading states
  const [isExporting, setIsExporting] = useState(false);

  // --- Notification Contact Management Functions ---

  const handleAddEmail = () => {
    if (newNotificationEmail && !notificationEmails.includes(newNotificationEmail)) {
      const updatedEmails = [...notificationEmails, newNotificationEmail];
      setNotificationEmails(updatedEmails);
      localStorage.setItem("notificationEmails", JSON.stringify(updatedEmails));
      setNewNotificationEmail(""); // Clear input after adding
      
      // Send welcome notification
      addEmailNotification(newNotificationEmail, `Welcome! Your email ${newNotificationEmail} has been added to receive real-time motor monitoring alerts.`);
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    const updatedEmails = notificationEmails.filter(email => email !== emailToRemove);
    setNotificationEmails(updatedEmails);
    localStorage.setItem("notificationEmails", JSON.stringify(updatedEmails));
  };

  const handleAddPhone = () => {
    if (newNotificationPhone && !notificationPhones.includes(newNotificationPhone)) {
      const updatedPhones = [...notificationPhones, newNotificationPhone];
      setNotificationPhones(updatedPhones);
      localStorage.setItem("notificationPhones", JSON.stringify(updatedPhones));
      setNewNotificationPhone(""); // Clear input after adding
      
      // Send welcome notification
      addSMSNotification(newNotificationPhone, `Welcome! Your phone ${newNotificationPhone} has been added to receive real-time motor monitoring alerts.`);
    }
  };

  const handleRemovePhone = (phoneToRemove) => {
    const updatedPhones = notificationPhones.filter(phone => phone !== phoneToRemove);
    setNotificationPhones(updatedPhones);
    localStorage.setItem("notificationPhones", JSON.stringify(updatedPhones));
  };

  // --- Send Test Notifications ---

  const handleSendTestEmail = async () => {
    if (notificationEmails.length > 0) {
      try {
        await notificationService.sendTestEmail(notificationEmails[0]); // Send to first email for testing
        alert(`Test email notification sent to ${notificationEmails[0]}! Check your email inbox.`);
      } catch (error) {
        alert(`Failed to send test email: ${error.message}`);
      }
    } else {
      alert("Please add at least one email address first!");
    }
  };

  const handleSendTestSMS = async () => {
    if (notificationPhones.length > 0) {
      try {
        await notificationService.sendTestSMS(notificationPhones[0]); // Send to first phone for testing
        alert(`Test SMS notification sent to ${notificationPhones[0]}! Check your phone.`);
      } catch (error) {
        alert(`Failed to send test SMS: ${error.message}`);
      }
    } else {
      alert("Please add at least one phone number first!");
    }
  };

  // --- Profile Picture Management ---

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setProfilePic(imageData);
        localStorage.setItem("profilePic", imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Data Export Functions ---

  const handleUnitChange = (type, newUnit) => {
    const updatedPreferences = { ...displayPreferences };
    
    if (type === 'temperature') {
      updatedPreferences.temperatureUnit = newUnit;
    } else if (type === 'vibration') {
      updatedPreferences.vibrationUnit = newUnit;
    }
    
    setDisplayPreferences(updatedPreferences);
    localStorage.setItem("displayPreferences", JSON.stringify(updatedPreferences));
    
    // Trigger unit change event for other components
    window.dispatchEvent(new CustomEvent('unitChanged', {
      detail: { type, unit: newUnit }
    }));
  };

  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      // Get all motor data and history
      const allData = [];
      
      // Add current motor data
      motors.forEach(motor => {
        const convertedTemp = UnitConverter.celsiusToFahrenheit(motor.temperature || 0);
        const convertedVib = motor.vibration || 0;
        
        allData.push({
          Motor_ID: motor.id,
          Motor_Name: motor.name,
          Location: motor.location,
          Status: motor.status,
          Temperature: `${convertedTemp.toFixed(2)}°F`,
          Vibration: `${convertedVib.toFixed(3)}m/s²`,
          Last_Updated: motor.lastUpdated ? new Date(motor.lastUpdated).toISOString() : 'N/A',
          Data_Type: 'Current'
        });
      });
      
      // Add historical data
      historyData.forEach(record => {
        const convertedTemp = UnitConverter.celsiusToFahrenheit(record.temperature || 0);
        const convertedVib = record.vibration || 0;
        
        allData.push({
          Motor_ID: record.motor_id,
          Motor_Name: record.motor_name || 'N/A',
          Location: record.location || 'N/A',
          Status: record.status,
          Temperature: `${convertedTemp.toFixed(2)}°F`,
          Vibration: `${convertedVib.toFixed(3)}m/s²`,
          Timestamp: record.timestamp ? new Date(record.timestamp).toISOString() : 'N/A',
          Data_Type: 'Historical'
        });
      });
      
      // Create CSV content
      const headers = Object.keys(allData[0] || {});
      const csvContent = [
        headers.join(','),
        ...allData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `motor_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSV export completed successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Error exporting CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    
    try {
      // Create PDF content (simplified version - in real app, use jsPDF or similar)
      const pdfContent = {
        title: 'SEP Motor Monitoring Report',
        date: new Date().toLocaleDateString(),
        motors: motors.map(motor => ({
          id: motor.id,
          name: motor.name,
          status: motor.status,
          temperature: `${UnitConverter.celsiusToFahrenheit(motor.temperature || 0).toFixed(2)}°F`,
          vibration: `${(motor.vibration || 0).toFixed(3)}m/s²`
        })),
        summary: {
          totalMotors: motors.length,
          healthyMotors: motors.filter(m => m.status === 'Healthy').length,
          warningMotors: motors.filter(m => m.status === 'Warning').length,
          faultMotors: motors.filter(m => m.status === 'Fault').length
        }
      };
      
      // For now, create a text representation and download as .txt
      // In a real implementation, you would use jsPDF or similar library
      const textContent = `
SEP Motor Monitoring Report
Generated: ${pdfContent.date}

Summary:
- Total Motors: ${pdfContent.summary.totalMotors}
- Healthy: ${pdfContent.summary.healthyMotors}
- Warning: ${pdfContent.summary.warningMotors}
- Fault: ${pdfContent.summary.faultMotors}

Motor Details:
${pdfContent.motors.map(motor => `
Motor ID: ${motor.id}
Name: ${motor.name}
Status: ${motor.status}
Temperature: ${motor.temperature}
Vibration: ${motor.vibration}
`).join('\n')}
      `;
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `motor_report_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Report export completed successfully! (Note: Full PDF export requires jsPDF library)');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = (format) => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  };



  // --- Save Changes ---

  const handleSaveChanges = () => {
    // Save all settings to localStorage
    localStorage.setItem("emailAlerts", emailAlerts);
    localStorage.setItem("smsPushNotifications", smsPushNotifications);
    localStorage.setItem("notificationEmails", JSON.stringify(notificationEmails));
    localStorage.setItem("notificationPhones", JSON.stringify(notificationPhones));
    localStorage.setItem("displayPreferences", JSON.stringify(displayPreferences));
    localStorage.setItem("tempThreshold", tempThreshold);
    localStorage.setItem("vibrationThreshold", vibrationThreshold);
    localStorage.setItem("calibrationValue", calibrationValue);
    localStorage.setItem("dataRetentionDays", dataRetentionDays);
    localStorage.setItem("enableScheduledReports", enableScheduledReports);
    localStorage.setItem("reportFrequency", reportFrequency);

    // Send confirmation notifications
    if (emailAlerts && notificationEmails.length > 0) {
      notificationEmails.forEach(email => {
        addEmailNotification(email, "Settings updated successfully! Your notification preferences have been saved.");
      });
    }
    
    if (smsPushNotifications && notificationPhones.length > 0) {
      notificationPhones.forEach(phone => {
        addSMSNotification(phone, "Settings updated successfully! Your notification preferences have been saved.");
      });
    }

    alert("Settings saved successfully! All changes have been applied.");
  };

  // --- Logout and Account Management ---

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
      console.log("Account deleted!");
      alert("Account deleted!");
      navigate("/login");
    }
  };

  // --- Effect to listen for unit changes ---

  useEffect(() => {
    const handleUnitChangeEvent = (event) => {
      const { type, unit } = event.detail;
      const updatedPreferences = { ...displayPreferences };
      
      if (type === 'temperature') {
        updatedPreferences.temperatureUnit = unit;
      } else if (type === 'vibration') {
        updatedPreferences.vibrationUnit = unit;
      }
      
      setDisplayPreferences(updatedPreferences);
    };

    window.addEventListener('unitChanged', handleUnitChangeEvent);
    return () => window.removeEventListener('unitChanged', handleUnitChangeEvent);
  }, [displayPreferences]);

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
            <div className="input-group">
              <input
                type="email"
                value={newNotificationEmail}
                onChange={(e) => setNewNotificationEmail(e.target.value)}
                placeholder="Enter email address"
                className="settings-input"
              />
              <button onClick={handleAddEmail} className="add-button">
                <FaPlus />
              </button>
            </div>
            {notificationEmails.length > 0 && (
              <div className="email-list">
                {notificationEmails.map((email, index) => (
                  <div key={index} className="email-item">
                    <span>{email}</span>
                    <button onClick={() => handleRemoveEmail(email)} className="remove-button">
                      <FaMinusCircle />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleSendTestEmail} className="test-button">
              <FaPaperPlane /> Send Test Email
            </button>
          </div>

          {/* SMS Push Notifications */}
          <div className="setting-item switch-container">
            <label htmlFor="smsPushToggle" className="settings-label switch-label">
              Enable SMS Push Notifications
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="smsPushToggle"
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
            <div className="input-group">
              <input
                type="tel"
                value={newNotificationPhone}
                onChange={(e) => setNewNotificationPhone(e.target.value)}
                placeholder="Enter phone number"
                className="settings-input"
              />
              <button onClick={handleAddPhone} className="add-button">
                <FaPlus />
              </button>
            </div>
            {notificationPhones.length > 0 && (
              <div className="phone-list">
                {notificationPhones.map((phone, index) => (
                  <div key={index} className="phone-item">
                    <span>{phone}</span>
                    <button onClick={() => handleRemovePhone(phone)} className="remove-button">
                      <FaMinusCircle />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleSendTestSMS} className="test-button">
              <FaPaperPlane /> Send Test SMS
            </button>
          </div>
        </section>

        {/* Sensor & Device Settings */}
        <section className="settings-card sensor-section">
          <h2><FaThermometerHalf className="section-icon" /> Sensor & Device Settings</h2>
          
          {/* Temperature Unit */}
          <div className="setting-item">
            <label className="settings-label">Temperature Unit:</label>
            <select 
              value={displayPreferences.temperatureUnit} 
              onChange={(e) => handleUnitChange('temperature', e.target.value)}
              className="settings-select"
            >
              <option value="C">Celsius (°C)</option>
              <option value="F">Fahrenheit (°F)</option>
              <option value="K">Kelvin (K)</option>
            </select>
          </div>

          {/* Vibration Unit */}
          <div className="setting-item">
            <label className="settings-label">Vibration Unit:</label>
            <select 
              value={displayPreferences.vibrationUnit} 
              onChange={(e) => handleUnitChange('vibration', e.target.value)}
              className="settings-select"
            >
              <option value="m/s²">Meters per second squared (m/s²)</option>
              <option value="g">G-force (g)</option>
              <option value="mm/s">Millimeters per second (mm/s)</option>
            </select>
          </div>

          {/* Temperature Threshold */}
          <div className="setting-item">
            <label className="settings-label">Temperature Threshold (°{displayPreferences.temperatureUnit}):</label>
            <input
              type="number"
              value={tempThreshold}
              onChange={(e) => setTempThreshold(Number(e.target.value))}
              className="settings-input"
              min="0"
              max="200"
            />
          </div>

          {/* Vibration Threshold */}
          <div className="setting-item">
            <label className="settings-label">Vibration Threshold ({displayPreferences.vibrationUnit}):</label>
            <input
              type="number"
              value={vibrationThreshold}
              onChange={(e) => setVibrationThreshold(Number(e.target.value))}
              className="settings-input"
              min="0"
              max="50"
              step="0.1"
            />
          </div>

          {/* Calibration Value */}
          <div className="setting-item">
            <label className="settings-label">Calibration Value:</label>
            <input
              type="number"
              value={calibrationValue}
              onChange={(e) => setCalibrationValue(Number(e.target.value))}
              className="settings-input"
              step="0.01"
            />
          </div>
        </section>

        {/* Data Management */}
        <section className="settings-card data-section">
          <h2><FaDatabase className="section-icon" /> Data Management</h2>
          
          {/* Data Retention */}
          <div className="setting-item">
            <label className="settings-label">Data Retention (days):</label>
            <input
              type="number"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              className="settings-input"
              min="1"
              max="365"
            />
          </div>

          {/* Export Data */}
          <div className="setting-item">
            <label className="settings-label">Export Data:</label>
            <div className="data-export-buttons">
              <button 
                onClick={() => handleExportData('csv')} 
                className="settings-button csv-button"
                disabled={isExporting}
              >
                <FaFileCsv /> Export as CSV
              </button>
              <button 
                onClick={() => handleExportData('pdf')} 
                className="settings-button pdf-button"
                disabled={isExporting}
              >
                <FaFilePdf /> Export as PDF
              </button>
            </div>
            {isExporting && <p className="export-status">Exporting data...</p>}
          </div>

          {/* Scheduled Reports */}
          <div className="setting-item switch-container">
            <label htmlFor="scheduledReportsToggle" className="settings-label switch-label">
              Enable Scheduled Reports
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="scheduledReportsToggle"
                checked={enableScheduledReports}
                onChange={() => setEnableScheduledReports(!enableScheduledReports)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          {enableScheduledReports && (
            <div className="setting-item">
              <label className="settings-label">Report Frequency:</label>
              <select 
                value={reportFrequency} 
                onChange={(e) => setReportFrequency(e.target.value)}
                className="settings-select"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </section>

        {/* Account Management */}
        <section className="settings-card account-section">
          <h2>Account Management</h2>
          
          <div className="setting-item">
            <button onClick={handleLogout} className="logout-button">
              <FaSignOutAlt /> Logout
            </button>
          </div>
          
          <div className="setting-item">
            <button 
              onClick={handleDeleteAccount} 
              className={`delete-button ${confirmDelete ? 'confirm' : ''}`}
            >
              <FaTrashAlt /> {confirmDelete ? 'Click again to confirm' : 'Delete Account'}
            </button>
          </div>
        </section>

        {/* Save Changes Button */}
        <div className="save-changes-section">
          <button onClick={handleSaveChanges} className="save-button">
            <FaSave /> Save All Changes
          </button>
        </div>
      </main>
    </div>
  );
}