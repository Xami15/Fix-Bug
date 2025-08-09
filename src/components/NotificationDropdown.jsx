import React, { useState, useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { FaBell, FaEnvelope, FaSms, FaExclamationTriangle, FaTimes, FaCheck, FaTrash } from 'react-icons/fa';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, darkMode } = useContext(ThemeContext);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
        };
      case 'dark':
        return {
          background: "rgba(31, 41, 55, 0.95)",
          borderColor: "rgba(75, 85, 99, 0.3)",
          textColor: "#f9fafb",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
        };
      case 'blue':
        return {
          background: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(51, 65, 85, 0.3)",
          textColor: "#f1f5f9",
          hoverBg: "rgba(255, 255, 255, 0.1)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
        };
      default:
        return {
          background: "rgba(255, 255, 255, 0.95)",
          borderColor: "rgba(0, 0, 0, 0.1)",
          textColor: "#1f2937",
          hoverBg: "rgba(0, 0, 0, 0.05)",
          shadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
        };
    }
  };

  const colors = getThemeColors();

  const getNotificationIcon = (type, severity) => {
    switch (type) {
      case 'email':
        return <FaEnvelope style={{ color: '#3b82f6' }} />;
      case 'sms':
        return <FaSms style={{ color: '#10b981' }} />;
      case 'alert':
        return severity === 'critical' ? 
          <FaExclamationTriangle style={{ color: '#ef4444' }} /> : 
          <FaExclamationTriangle style={{ color: '#f59e0b' }} />;
      default:
        return <FaBell style={{ color: '#6b7280' }} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          position: "relative",
          fontSize: "20px",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
          e.target.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "transparent";
          e.target.style.transform = "translateY(0)";
        }}
      >
        <FaBell />
        {/* Notification badge */}
        {unreadCount > 0 && (
          <div style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            minWidth: "18px",
            height: "18px",
            background: "#ef4444",
            borderRadius: "50%",
            border: `2px solid ${colors.background}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: "bold",
            color: "white",
            padding: "0 4px"
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "120%",
          right: 0,
          width: "400px",
          maxHeight: "500px",
          background: colors.background,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${colors.borderColor}`,
          borderRadius: "16px",
          boxShadow: colors.shadow,
          zIndex: 1001,
          overflow: "hidden",
          color: colors.textColor
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.borderColor}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.textColor,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  <FaCheck /> Mark all read
                </button>
              )}
              <button
                onClick={clearAllNotifications}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textColor,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
              >
                <FaTrash /> Clear all
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: colors.textColor,
                opacity: 0.7
              }}>
                <FaBell style={{ fontSize: "32px", marginBottom: "12px" }} />
                <p style={{ margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${colors.borderColor}`,
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                    background: notification.read ? "transparent" : "rgba(59, 130, 246, 0.1)",
                    borderLeft: `4px solid ${getSeverityColor(notification.severity)}`
                  }}
                  onMouseEnter={(e) => e.target.style.background = colors.hoverBg}
                  onMouseLeave={(e) => e.target.style.background = notification.read ? "transparent" : "rgba(59, 130, 246, 0.1)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                      <div style={{ marginTop: "2px" }}>
                        {getNotificationIcon(notification.type, notification.severity)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: notification.read ? "400" : "600",
                          fontSize: "14px",
                          marginBottom: "4px",
                          color: notification.read ? colors.textColor : "#1f2937"
                        }}>
                          {notification.title}
                        </div>
                        <div style={{
                          fontSize: "13px",
                          color: colors.textColor,
                          opacity: 0.8,
                          lineHeight: "1.4"
                        }}>
                          {notification.message}
                        </div>
                        <div style={{
                          fontSize: "11px",
                          color: colors.textColor,
                          opacity: 0.6,
                          marginTop: "8px"
                        }}>
                          {formatTime(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.textColor,
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        opacity: 0.6,
                        fontSize: "12px"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = "1";
                        e.target.style.background = "rgba(239, 68, 68, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = "0.6";
                        e.target.style.background = "transparent";
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationDropdown; 