import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { notificationService } from '../services/notificationService';
import { FaBell, FaPhoneAlt, FaEnvelope, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import './NotificationTester.css';

const NotificationTester = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testType, setTestType] = useState('sms');
  const [testInput, setTestInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const { addNotification } = useNotifications();

  const handleTest = async () => {
    if (!testInput.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid ' + (testType === 'sms' ? 'phone number' : 'email address') });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      let result;
      
      if (testType === 'sms') {
        result = await notificationService.sendTestSMS(testInput);
      } else {
        result = await notificationService.sendTestEmail(testInput);
      }

      setTestResult({ success: true, message: result.message });
      
      // Add success notification to dashboard
      addNotification({
        id: `test-${Date.now()}`,
        type: testType,
        title: `Test ${testType.toUpperCase()} Successful`,
        message: `Test ${testType.toUpperCase()} sent to ${testInput}`,
        timestamp: new Date(),
        read: false,
        severity: 'success'
      });

    } catch (error) {
      setTestResult({ success: false, message: error.message });
      
      // Add error notification to dashboard
      addNotification({
        id: `test-error-${Date.now()}`,
        type: testType,
        title: `Test ${testType.toUpperCase()} Failed`,
        message: `Failed to send test ${testType.toUpperCase()}: ${error.message}`,
        timestamp: new Date(),
        read: false,
        severity: 'error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = () => {
    const config = notificationService.isConfigured();
    if (config.any) return '#10b981'; // Green
    if (config.twilio || config.emailjs) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getStatusText = () => {
    const config = notificationService.isConfigured();
    if (config.any) return 'Ready';
    if (config.twilio || config.emailjs) return 'Partially Ready';
    return 'Not Configured';
  };

  return (
    <>
      {/* Floating Notification Button */}
      <button
        className="notification-tester-button"
        onClick={() => setIsOpen(true)}
        style={{ '--status-color': getStatusColor() }}
        title={`Notification Status: ${getStatusText()}`}
      >
        <FaBell />
        <span className="status-dot"></span>
      </button>

      {/* Notification Tester Modal */}
      {isOpen && (
        <div className="notification-tester-overlay" onClick={() => setIsOpen(false)}>
          <div className="notification-tester-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FaBell /> Notification Tester</h3>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-content">
              {/* Service Status */}
              <div className="service-status-section">
                <h4>Service Status</h4>
                <div className="status-grid">
                  <div className={`status-item ${notificationService.isConfigured().twilio ? 'ready' : 'not-ready'}`}>
                    <FaPhoneAlt />
                    <span>SMS (Twilio)</span>
                    <span className="status-text">
                      {notificationService.isConfigured().twilio ? 'Ready' : 'Not Configured'}
                    </span>
                  </div>
                  <div className={`status-item ${notificationService.isConfigured().emailjs ? 'ready' : 'not-ready'}`}>
                    <FaEnvelope />
                    <span>EmailJS</span>
                    <span className="status-text">
                      {notificationService.isConfigured().emailjs ? 'Ready' : 'Not Configured'}
                    </span>
                  </div>
                  <div className={`status-item ${notificationService.isConfigured().email ? 'ready' : 'not-ready'}`}>
                    <FaEnvelope />
                    <span>Gmail</span>
                    <span className="status-text">
                      {notificationService.isConfigured().email ? 'Ready' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Section */}
              <div className="test-section">
                <h4>Test Notifications</h4>
                
                <div className="test-controls">
                  <div className="test-type-selector">
                    <label>
                      <input
                        type="radio"
                        value="sms"
                        checked={testType === 'sms'}
                        onChange={(e) => setTestType(e.target.value)}
                      />
                      <FaPhoneAlt /> SMS
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="email"
                        checked={testType === 'email'}
                        onChange={(e) => setTestType(e.target.value)}
                      />
                      <FaEnvelope /> Email
                    </label>
                  </div>

                  <div className="test-input-group">
                    <input
                      type={testType === 'sms' ? 'tel' : 'email'}
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder={testType === 'sms' ? '+1234567890' : 'test@example.com'}
                      className="test-input"
                    />
                    <button
                      onClick={handleTest}
                      disabled={isTesting || !testInput.trim()}
                      className="test-button"
                    >
                      {isTesting ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.success ? (
                      <FaCheck className="result-icon" />
                    ) : (
                      <FaExclamationTriangle className="result-icon" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h4>Quick Actions</h4>
                <div className="action-buttons">
                  <button
                    onClick={() => window.open('/emailjs-setup.html', '_blank')}
                    className="action-button"
                  >
                    <FaEnvelope /> EmailJS Setup Guide
                  </button>
                  <button
                    onClick={() => window.open('https://www.twilio.com', '_blank')}
                    className="action-button"
                  >
                    <FaPhoneAlt /> Twilio Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationTester;
