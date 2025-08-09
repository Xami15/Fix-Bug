import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../authService";
import { supabase } from "../utils/supabase";
import { getAuth } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import "./Login.css";

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
    <div className={`login-container ${isActive ? 'active' : ''}`}>
      <form onSubmit={handleEmailLogin} className="login-form">
        <div className="login-header">
          <h1 className="login-title">👋 Welcome Back</h1>
          <p className="login-subtitle">
            Sign in to access your SEP Monitoring Dashboard
          </p>
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
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              className="form-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" className="login-button primary">
          Sign In
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={gLoading}
          className="login-button social google"
        >
          {gLoading ? (
            <span className="loading-spinner">⏳</span>
          ) : (
            <>
              <FcGoogle className="social-icon" />
              Continue with Google
            </>
          )}
        </button>
      </form>
    </div>
  );
}
