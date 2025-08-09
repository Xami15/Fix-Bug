import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupWithEmail } from "../authService";
import { updateProfile } from "firebase/auth";
import { supabase } from "../utils/supabase";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import "./Signup.css";

export default function Signup({ onLogin, isActive }) {
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className={`signup-container ${isActive ? 'active' : ''}`}>
      <form onSubmit={handleEmailSignup} className="signup-form">
        <div className="signup-header">
          <h1 className="signup-title">🚀 Create Account</h1>
          <p className="signup-subtitle">
            Join SEP Monitoring Dashboard and start monitoring your motors
          </p>
        </div>

        <div className="social-icons">
          {["linkedin", "github"].map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => handleIconClick(icon)}
              onMouseEnter={() => setHoveredIcon(icon)}
              onMouseLeave={() => setHoveredIcon(null)}
              className={`social-icon-button ${hoveredIcon === icon ? 'hovered' : ''}`}
            >
              <span className="social-icon">
                {icon === "linkedin" ? "💼" : <FaGithub />}
              </span>
            </button>
          ))}
        </div>

        <p className="divider-text">Or use your email for registration</p>

        <div className="form-group">
          <input
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Enter your full name"
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <input
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Enter your email"
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <div className="password-input-container">
            <input
              name="password"
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type={showPass ? "text" : "password"}
              placeholder="Create a password"
              required
              className="form-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" className="signup-button primary">
          Create Account
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="signup-button social google"
        >
          <FcGoogle className="social-icon" />
          Continue with Google
        </button>
      </form>
    </div>
  );
}
