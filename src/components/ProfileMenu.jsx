import React, { useState } from 'react';
import { FaUserCircle, FaSignOutAlt, FaCog, FaCamera } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ProfileMenu = ({ darkMode }) => {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('profilePic') || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  // Load user info from localStorage or elsewhere if needed
  React.useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedName = localStorage.getItem('userName');
    if (storedEmail) setEmail(storedEmail);
    if (storedName) setName(storedName);
  }, []);

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

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          border: "none",
          backgroundColor: darkMode ? "#374151" : "#f3f4f6",
          color: darkMode ? "#e5e7eb" : "#111827",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
          display: "flex",
          alignItems: "center",
          fontSize: "1.5rem",
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
              marginRight: 8,
              border: `2px solid ${darkMode ? "#e5e7eb" : "#2563eb"}`,
            }}
          />
        ) : (
          <FaUserCircle />
        )}
      </button>
      {open && !showSettings && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            background: darkMode ? "#374151" : "#fff",
            color: darkMode ? "#e5e7eb" : "#111827",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            borderRadius: 8,
            minWidth: 180,
            zIndex: 1001,
            padding: "0.5rem 0",
          }}
        >
          <button
            onClick={handleProfileSettings}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              padding: "0.75rem 1rem",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "inherit",
            }}
          >
            <FaCog /> Change Profile Picture
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              padding: "0.75rem 1rem",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "inherit",
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      )}
      {open && showSettings && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            background: darkMode ? "#374151" : "#fff",
            color: darkMode ? "#e5e7eb" : "#111827",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            borderRadius: 8,
            minWidth: 220,
            zIndex: 1001,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="profilePicInput" style={{ cursor: "pointer" }}>
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile Preview"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${darkMode ? "#e5e7eb" : "#2563eb"}`,
                  }}
                />
              ) : (
                <FaCamera style={{ fontSize: "2.5rem" }} />
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
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;