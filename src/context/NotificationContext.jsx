import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMotors } from './MotorsContext';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [unreadCount, setUnreadCount] = useState(0);
  const { motors } = useMotors();

  const addNotification = useCallback((notification) => {
    // Check if similar notification already exists (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const similarExists = notifications.some(n => 
      n.motorId === notification.motorId && 
      n.type === notification.type &&
      n.timestamp > fiveMinutesAgo
    );

    if (!similarExists) {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep only last 50 notifications
    }
  }, [notifications]);

  // Load notifications from localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Function to send real notifications to email/phone
  const sendRealNotifications = useCallback(async (alertMessage, severity) => {
    const emailAlerts = localStorage.getItem('emailAlerts') === 'true';
    const smsAlerts = localStorage.getItem('smsPushNotifications') === 'true';
    
    try {
      if (emailAlerts) {
        const notificationEmails = JSON.parse(localStorage.getItem('notificationEmails') || '[]');
        if (notificationEmails.length > 0) {
          try {
            await notificationService.sendAlertEmail(notificationEmails, alertMessage);
            console.log('Email alerts sent successfully');
          } catch (error) {
            console.error('Failed to send email alerts:', error);
          }
        }
      }
      
      if (smsAlerts) {
        const notificationPhones = JSON.parse(localStorage.getItem('notificationPhones') || '[]');
        if (notificationPhones.length > 0) {
          try {
            await notificationService.sendAlertSMS(notificationPhones, alertMessage);
            console.log('SMS alerts sent successfully');
          } catch (error) {
            console.error('Failed to send SMS alerts:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending real notifications:', error);
    }
  }, []);

  // Monitor motors for alerts and create notifications
  useEffect(() => {
    motors.forEach(motor => {
      const { id, name, temperature, vibration, status } = motor;
      
      // Get thresholds and display preferences from settings
      const tempThreshold = Number(localStorage.getItem('tempThreshold')) || 30;
      const vibThreshold = Number(localStorage.getItem('vibrationThreshold')) || 5;
      
      // Get display preferences from localStorage
      const savedPreferences = localStorage.getItem('displayPreferences');
      const displayPreferences = savedPreferences ? JSON.parse(savedPreferences) : {
        temperatureUnit: 'C',
        vibrationUnit: 'm/s²'
      };
      
      const temperatureUnit = displayPreferences.temperatureUnit === 'F' ? '°F' : '°C';
      const vibrationUnit = displayPreferences.vibrationUnit;
      
      // Check temperature threshold
      if (temperature && temperature > tempThreshold) {
        const alertMessage = `Motor ${name} (${id}) temperature is ${temperature}${temperatureUnit}, exceeding threshold of ${tempThreshold}${temperatureUnit}`;
        
        addNotification({
          id: `temp-${id}-${Date.now()}`,
          type: 'alert',
          title: 'High Temperature Alert',
          message: alertMessage,
          timestamp: new Date(),
          read: false,
          motorId: id,
          severity: 'warning'
        });
        
        // Send real notifications
        sendRealNotifications(alertMessage, 'warning');
      }

      // Check vibration threshold
      if (vibration && vibration > vibThreshold) {
        const alertMessage = `Motor ${name} (${id}) vibration is ${vibration}${vibrationUnit}, exceeding threshold of ${vibThreshold}${vibrationUnit}`;
        
        addNotification({
          id: `vib-${id}-${Date.now()}`,
          type: 'alert',
          title: 'High Vibration Alert',
          message: alertMessage,
          timestamp: new Date(),
          read: false,
          motorId: id,
          severity: 'warning'
        });
        
        // Send real notifications
        sendRealNotifications(alertMessage, 'warning');
      }

      // Check for fault status
      if (status === 'Fault' || status === 'FAULT') {
        const alertMessage = `Motor ${name} (${id}) is in fault status. Immediate attention required.`;
        
        addNotification({
          id: `fault-${id}-${Date.now()}`,
          type: 'alert',
          title: 'Motor Fault Detected',
          message: alertMessage,
          timestamp: new Date(),
          read: false,
          motorId: id,
          severity: 'critical'
        });
        
        // Send real notifications for critical alerts
        sendRealNotifications(alertMessage, 'critical');
      }
    });
  }, [motors, addNotification, sendRealNotifications]);

  const addEmailNotification = useCallback(async (email, subject) => {
    try {
      await notificationService.sendEmail(email, subject, "This is a test email from SEP Monitor.");
      
      addNotification({
        id: `email-${Date.now()}`,
        type: 'email',
        title: 'Email Sent',
        message: `Email sent to ${email}: ${subject}`,
        timestamp: new Date(),
        read: false,
        severity: 'info'
      });
      
      console.log(`Email sent to ${email}: ${subject}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      
      addNotification({
        id: `email-error-${Date.now()}`,
        type: 'email',
        title: 'Email Failed',
        message: `Failed to send email to ${email}: ${error.message}`,
        timestamp: new Date(),
        read: false,
        severity: 'error'
      });
    }
  }, [addNotification]);

  const addSMSNotification = useCallback(async (phone, message) => {
    try {
      await notificationService.sendSMS(phone, message);
      
      addNotification({
        id: `sms-${Date.now()}`,
        type: 'sms',
        title: 'SMS Sent',
        message: `SMS sent to ${phone}: ${message}`,
        timestamp: new Date(),
        read: false,
        severity: 'info'
      });
      
      console.log(`SMS sent to ${phone}: ${message}`);
    } catch (error) {
      console.error(`Failed to send SMS to ${phone}:`, error);
      
      addNotification({
        id: `sms-error-${Date.now()}`,
        type: 'sms',
        title: 'SMS Failed',
        message: `Failed to send SMS to ${phone}: ${error.message}`,
        timestamp: new Date(),
        read: false,
        severity: 'error'
      });
    }
  }, [addNotification]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    addEmailNotification,
    addSMSNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 