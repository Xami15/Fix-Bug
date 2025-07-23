import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";

export default function LoginSignup() {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/dashboard");
  };

  const containerStyle = {
    position: "relative",
    width: "768px",
    maxWidth: "100%",
    minHeight: "480px",
    overflow: "hidden",
    borderRadius: "10px",
    background: "#fff",
    boxShadow: "0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)",
    transition: "all 0.4s ease",
    zIndex: 2,
  };

  const buttonStyle = {
    marginTop: "20px",
    padding: "12px 36px",
    fontSize: "16px",
    backgroundColor: "#ffffff",
    color: "#002147",
    border: "1px solid #fff",
    borderRadius: "20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    backgroundColor: "#e6e6e6",
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)", // darkness level
          zIndex: 1,
        }}
      ></div>

      {/* Main Auth container */}
      <div style={containerStyle} className={isActive ? "activate" : ""}>
        <Signup onLogin={handleLogin} isActive={isActive} />
        <Login onLogin={handleLogin} isActive={isActive} />

        {/* Overlay panel */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: "50%",
            height: "100%",
            overflow: "hidden",
            transition: "transform 0.6s ease-in-out",
            zIndex: 100,
            transform: isActive ? "translateX(-100%)" : "none",
          }}
        >
          <div
            style={{
              background: "linear-gradient(to right, #002147, #001f4d)",
              color: "#ffffff",
              position: "relative",
              left: "-100%",
              width: "200%",
              height: "100%",
              transform: isActive ? "translateX(50%)" : "translateX(0)",
              transition: "transform 0.6s ease-in-out",
              display: "flex",
            }}
          >
            {/* Left Panel */}
            <div
              style={{
                width: "50%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 30px",
                textAlign: "center",
                transform: isActive ? "translateX(0)" : "translateX(-200%)",
                transition: "transform 0.6s ease-in-out",
              }}
            >
              <h1 style={{ color: "white" }}>Welcome Back!</h1>
              <p style={{ color: "white" }}>To keep connected with us please login</p>
              <button
                style={buttonStyle}
                onClick={() => setIsActive(false)}
                onMouseOver={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.target.style, buttonStyle)}
              >
                Sign In
              </button>
            </div>

            {/* Right Panel */}
            <div
              style={{
                width: "50%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 30px",
                textAlign: "center",
                transform: isActive ? "translateX(200%)" : "translateX(0)",
                transition: "transform 0.6s ease-in-out",
              }}
            >
              <h1 style={{ color: "white" }}>Hello, Friend!</h1>
              <p style={{ color: "white" }}>Enter your details and start your journey with us</p>
              <button
                style={buttonStyle}
                onClick={() => setIsActive(true)}
                onMouseOver={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                onMouseOut={(e) => Object.assign(e.target.style, buttonStyle)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
