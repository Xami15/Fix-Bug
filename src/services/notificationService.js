class NotificationService {
  constructor() {
    this.baseURL = 'http://localhost:8001/notifications';
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  async sendSMS(phoneNumber, message) {
    return this.makeRequest('/sms', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        message: message
      })
    });
  }

  async sendEmail(email, subject, message) {
    return this.makeRequest('/email', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        subject: subject,
        message: message
      })
    });
  }

  async sendBulkSMS(phoneNumbers, message) {
    return this.makeRequest('/sms/bulk', {
      method: 'POST',
      body: JSON.stringify({
        phone_numbers: phoneNumbers,
        message: message
      })
    });
  }

  async sendBulkEmail(emails, subject, message) {
    return this.makeRequest('/email/bulk', {
      method: 'POST',
      body: JSON.stringify({
        emails: emails,
        subject: subject,
        message: message
      })
    });
  }

  async checkHealth() {
    return this.makeRequest('/health');
  }

  // Helper method to format messages with dashboard name
  formatMessage(message) {
    return `SEP Monitor: ${message}`;
  }

  // Helper method to send test notifications
  async sendTestSMS(phoneNumber) {
    const message = this.formatMessage("Your system is connected to this webapp!");
    return this.sendSMS(phoneNumber, message);
  }

  async sendTestEmail(email) {
    const subject = "SEP Monitor - System Connected";
    const message = "Your system is connected to this webapp!";
    return this.sendEmail(email, subject, message);
  }

  // Helper method to send alert notifications
  async sendAlertSMS(phoneNumbers, alertMessage) {
    const message = this.formatMessage(alertMessage);
    return this.sendBulkSMS(phoneNumbers, message);
  }

  async sendAlertEmail(emails, alertMessage) {
    const subject = "SEP Monitor - Alert";
    const message = alertMessage;
    return this.sendBulkEmail(emails, subject, message);
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 