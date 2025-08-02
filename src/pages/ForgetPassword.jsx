import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig"; // Make sure this path is correct
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    const actionCodeSettings = {
      // --- CHANGE THIS LINE ---
      url: window.location.origin + "/reset-password", // Dynamic URL based on current domain
      //url:"http://localhost:3000/reset-password",
      // --- END OF CHANGE ---
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setMessage("Check your email for a reset link.");
      setError(null);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please try again later.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "float 20s infinite linear",
          zIndex: 0,
        }}
      />
      
      <form
        onSubmit={handleSubmit}
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "450px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <h2 style={{ 
          marginBottom: "30px", 
          color: "#333",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          🔑 Forgot Password
        </h2>
        
        <p style={{
          marginBottom: "25px",
          color: "#666",
          fontSize: "14px",
          lineHeight: "1.5"
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <div style={{ marginBottom: "25px" }}>
          <input
            type="email"
            placeholder="Enter your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "15px 20px",
              borderRadius: "12px",
              border: "2px solid #e1e5e9",
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

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px 20px",
            backgroundColor: loading ? "#ccc" : "#667eea",
            color: "#fff",
            fontWeight: "600",
            fontSize: "16px",
            border: "none",
            borderRadius: "12px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: loading ? "none" : "0 4px 15px rgba(102, 126, 234, 0.3)",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
            }
          }}
        >
          {loading ? "🔄 Sending..." : "📧 Send Reset Link"}
        </button>

        {message && (
          <div style={{ 
            marginTop: "20px", 
            padding: "12px 16px",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            border: "1px solid #4caf50",
            borderRadius: "8px",
            color: "#2e7d32",
            fontWeight: "500"
          }}>
            ✅ {message}
          </div>
        )}

        {error && (
          <div style={{ 
            marginTop: "20px", 
            padding: "12px 16px",
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            border: "1px solid #f44336",
            color: "#d32f2f",
            borderRadius: "8px",
            fontWeight: "500"
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{
          marginTop: "25px",
          paddingTop: "20px",
          borderTop: "1px solid #e1e5e9"
        }}>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              cursor: "pointer",
              fontSize: "14px",
              textDecoration: "underline",
              fontWeight: "500"
            }}
          >
            ← Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}