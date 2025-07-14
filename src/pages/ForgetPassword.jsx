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
      url: "https://sep-predictive-dashboard.web.app/reset-password", // Firebase hosting URL
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
        background: "#f5f5f5",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 15px",
            marginBottom: "16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#001f4d",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "16px",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {message && (
          <p style={{ marginTop: "16px", color: "green", fontWeight: "bold" }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ marginTop: "16px", color: "red", fontWeight: "bold" }}>
            {error}
          </p>
        )}

        <p
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color: "#001f4d",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => navigate("/login")}
        >
          Back to Login
        </p>
      </form>
    </div>
  );
}