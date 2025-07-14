import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithEmail } from "../authService";
import { updateProfile } from "firebase/auth";
import { createUser } from "../services/supabaseService";

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
      await updateProfile(cred, { displayName: name });

      // Save user data to Supabase using the service
      await createUser({
        name: name,
        email: email,
        password: pass, // Note: In production, use hashed password
      });

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
    background: hoveredIcon === icon ? "#001f4d" : "#f2f2f2",
    color: hoveredIcon === icon ? "#fff" : "#555",
  });

  return (
    <div style={style}>
      <form onSubmit={handleEmailSignup} style={formStyle}>
        <h1>Create Account</h1>

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

        <span>Use your email for registration</span>

        <input
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          placeholder="Name"
          style={inputStyle}
          required
        />

        <input
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          style={inputStyle}
          required
        />

        <div style={{ position: "relative", width: "100%" }}>
          <input
            name="password"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type={showPass ? "text" : "password"}
            placeholder="Password"
            style={{ ...inputStyle, paddingRight: "40px" }}
            required
          />
          <span
            onClick={() => setShowPass((prev) => !prev)}
            style={eyeIconStyle}
            title={showPass ? "Hide password" : "Show password"}
          >
            <i className={`fa-solid fa-eye${showPass ? "-slash" : ""}`}></i>
          </span>
        </div>

        <button type="submit" style={buttonStyle}>
          Sign Up
        </button>
      </form>
    </div>
  );
}

/* ---------- styles (unchanged) ---------- */
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
  padding: "12px 15px",
  margin: "12px 0",
  background: "#eee",
  border: "none",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const eyeIconStyle = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#555",
  fontSize: "18px",
  userSelect: "none",
};

const buttonStyle = {
  minWidth: "140px",
  padding: "12px 45px",
  marginTop: "10px",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#fff",
  background: "#001f4d",
  border: "1px solid #001f4d",
  borderRadius: "10px",
  cursor: "pointer",
};

const iconBase = {
  textDecoration: "none",
  width: "40px",
  height: "40px",
  margin: "0 5px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  fontSize: "18px",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

const iconContainer = { margin: "20px 0" };
