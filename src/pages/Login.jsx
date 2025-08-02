import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../authService";
import { supabase } from "../utils/supabase";
import { getAuth } from "firebase/auth";

export default function Login({ onLogin, isActive }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const navigate = useNavigate();

  // 🔄 Insert user into Supabase if not already there
  const storeUserIfNew = async (user) => {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.uid)
      .maybeSingle();

    if (!data && !error) {
      // User not found — insert
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: user.uid,
          email: user.email,
          created_at: new Date().toISOString(),
        },
      ]);
      if (insertError) {
        console.error("Error inserting user into Supabase:", insertError.message);
      }
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await loginWithEmail(email, pass);
      const user = getAuth().currentUser;

      if (user) await storeUserIfNew(user);

      localStorage.setItem("token", "loggedin");
      if (onLogin) onLogin();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    if (gLoading) return;
    setGLoading(true);
    try {
      await loginWithGoogle();
      const user = getAuth().currentUser;

      if (user) await storeUserIfNew(user);

      localStorage.setItem("token", "loggedin");
      if (onLogin) onLogin();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      alert(err.message);
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        height: "100%",
        width: "50%",
        transition: "all 0.6s ease-in-out",
        left: 0,
        zIndex: isActive ? 1 : 2,
        transform: isActive ? "translateX(100%)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleEmailLogin}
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 50px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <h1 style={{ 
          marginBottom: "20px",
          color: "#333",
          fontSize: "24px",
          fontWeight: "600"
        }}>
          👋 Welcome Back
        </h1>
        
        <p style={{
          marginBottom: "25px",
          color: "#666",
          fontSize: "14px",
          lineHeight: "1.5"
        }}>
          Sign in to access your SEP Monitoring Dashboard
        </p>

        {/* Email Input */}
        <div style={{ marginBottom: "15px" }}>
          <input
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Enter your email"
            required
            style={{
              width: "100%",
              padding: "15px 20px",
              background: "#f8f9fa",
              border: "2px solid #e1e5e9",
              borderRadius: "12px",
              fontSize: "16px",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
            }}
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

        {/* Password Input with Eye Icon */}
        <div
          style={{
            width: "100%",
            position: "relative",
            marginBottom: "15px",
          }}
        >
          <input
            name="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            required
            style={{
              width: "100%",
              padding: "15px 20px",
              background: "#f8f9fa",
              border: "2px solid #e1e5e9",
              borderRadius: "12px",
              fontSize: "16px",
              paddingRight: "50px",
              boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
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
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "#667eea",
              fontSize: "18px",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => e.target.style.color = "#4a5568"}
            onMouseLeave={(e) => e.target.style.color = "#667eea"}
          >
            <i className={`fa-solid fa-eye${showPassword ? "-slash" : ""}`}></i>
          </span>
        </div>

        {/* Forgot Password */}
        <div
          style={{
            width: "100%",
            textAlign: "right",
            fontSize: "14px",
            marginBottom: "20px",
          }}
        >
          <a
            href="/forgot-password"
            style={{ 
              color: "#667eea", 
              textDecoration: "none",
              fontWeight: "500",
              transition: "color 0.3s ease"
            }}
            onMouseEnter={(e) => e.target.style.color = "#4a5568"}
            onMouseLeave={(e) => e.target.style.color = "#667eea"}
          >
            Forgot Password?
          </a>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "15px 20px",
            marginBottom: "20px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#fff",
            background: "#667eea",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
          }}
        >
          🔐 Sign In
        </button>

        {/* Divider */}
        <div
          style={{
            margin: "20px 0",
            display: "flex",
            alignItems: "center",
            fontSize: "14px",
            color: "#999",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#e1e5e9" }}></div>
          <span style={{ margin: "0 15px" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#e1e5e9" }}></div>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            width: "100%",
            padding: "15px 20px",
            fontSize: "16px",
            color: "#4a5568",
            background: "#fff",
            border: "2px solid #e1e5e9",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#e1e5e9";
            e.target.style.boxShadow = "none";
          }}
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google icon"
            style={{ width: "20px", height: "20px" }}
          />
          Continue with Google
        </button>
      </form>
    </div>
  );
}
