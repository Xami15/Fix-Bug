import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithEmail } from "../authService";
import { updateProfile } from "firebase/auth";
import { supabase } from "../utils/supabase"; // your existing Supabase instance

export default function Signup({ onLogin, isActive }) {
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const style = {
    position: "absolute",
    top: 0,
    height: "100%",
    width: "50%",
    transition: "all 0.6s ease-in-out",
    left: 0,
    zIndex: isActive ? 5 : 1,
    opacity: isActive ? 1 : 0,
    transform: isActive ? "translateX(100%)" : "none",
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    try {
      const cred = await signupWithEmail(email, pass);
      await updateProfile(cred.user, { displayName: name });

      const user = cred.user;

      // 🟢 Insert user data into Supabase
      const { error } = await supabase.from("users").insert([
        {
          id: user.uid, // Firebase UID as primary key
          name: name,
          email: user.email,
          created_at: new Date().toISOString(), // current timestamp
        },
      ]);

      if (error) {
        console.error("Error inserting user into Supabase:", error.message);
        alert("There was an issue saving your data.");
        return;
      }

      localStorage.setItem("token", "loggedin");
      if (onLogin) onLogin();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        alert("Email already registered. Please log in.");
      } else {
        alert(err.message);
      }
    }
  };

  const handleIconClick = (type) => {
    if (type === "linkedin") window.open("https://linkedin.com", "_blank");
    else if (type === "github") window.open("https://github.com", "_blank");
  };

  const getIconStyle = (icon) => ({
    ...iconBase,
    background: hoveredIcon === icon ? "#667eea" : "#f8f9fa",
    color: hoveredIcon === icon ? "#fff" : "#667eea",
    borderColor: hoveredIcon === icon ? "#667eea" : "#e1e5e9",
  });

  return (
    <div style={style}>
      <form onSubmit={handleEmailSignup} style={formStyle}>
        <h1 style={{ 
          marginBottom: "20px",
          color: "#333",
          fontSize: "24px",
          fontWeight: "600"
        }}>
          🚀 Create Account
        </h1>
        
        <p style={{
          marginBottom: "25px",
          color: "#666",
          fontSize: "14px",
          lineHeight: "1.5"
        }}>
          Join SEP Monitoring Dashboard and start monitoring your motors
        </p>

        <div style={iconContainer}>
          {["linkedin", "github"].map((icon) => (
            <span
              key={icon}
              onClick={() => handleIconClick(icon)}
              onMouseEnter={() => setHoveredIcon(icon)}
              onMouseLeave={() => setHoveredIcon(null)}
              style={getIconStyle(icon)}
            >
              <i className={`fa-brands fa-${icon}`}></i>
            </span>
          ))}
        </div>

        <span style={{
          color: "#666",
          fontSize: "14px",
          marginBottom: "20px"
        }}>Or use your email for registration</span>

        <div style={{ marginBottom: "15px" }}>
          <input
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Enter your full name"
            style={inputStyle}
            required
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e1e5e9";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <input
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Enter your email"
            style={inputStyle}
            required
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e1e5e9";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ position: "relative", width: "100%", marginBottom: "20px" }}>
          <input
            name="password"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type={showPass ? "text" : "password"}
            placeholder="Create a password"
            style={{ ...inputStyle, paddingRight: "50px" }}
            required
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e1e5e9";
              e.target.style.boxShadow = "none";
            }}
          />
          <span
            onClick={() => setShowPass((prev) => !prev)}
            style={eyeIconStyle}
            title={showPass ? "Hide password" : "Show password"}
            onMouseEnter={(e) => e.target.style.color = "#4a5568"}
            onMouseLeave={(e) => e.target.style.color = "#667eea"}
          >
            <i className={`fa-solid fa-eye${showPass ? "-slash" : ""}`}></i>
          </span>
        </div>

        <button 
          type="submit" 
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
          }}
        >
          🚀 Create Account
        </button>
      </form>
    </div>
  );
}

/* ---------- styles ---------- */
const formStyle = {
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 50px",
  height: "100%",
  textAlign: "center",
};

const inputStyle = {
  width: "100%",
  padding: "15px 20px",
  background: "#f8f9fa",
  border: "2px solid #e1e5e9",
  borderRadius: "12px",
  fontSize: "16px",
  transition: "all 0.3s ease",
  boxSizing: "border-box",
};

const eyeIconStyle = {
  position: "absolute",
  right: "15px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#667eea",
  fontSize: "18px",
  userSelect: "none",
  transition: "color 0.3s ease",
};

const buttonStyle = {
  width: "100%",
  padding: "15px 20px",
  marginTop: "10px",
  fontSize: "16px",
  fontWeight: "600",
  color: "#fff",
  background: "#667eea",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
};

const iconBase = {
  textDecoration: "none",
  width: "45px",
  height: "45px",
  margin: "0 8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  fontSize: "20px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  border: "2px solid transparent",
};

const iconContainer = { margin: "20px 0" };
