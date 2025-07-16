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
        <h1 style={{ marginBottom: "10px" }}>Sign in</h1>

        {/* Email Input */}
        <input
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          required
          style={{
            width: "100%",
            padding: "12px 15px",
            margin: "8px 0",
            background: "#eee",
            border: "none",
            borderRadius: "8px",
          }}
        />

        {/* Password Input with Eye Icon */}
        <div
          style={{
            width: "100%",
            position: "relative",
            margin: "8px 0",
          }}
        >
          <input
            name="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            style={{
              width: "100%",
              padding: "12px 15px",
              background: "#eee",
              border: "none",
              borderRadius: "8px",
              paddingRight: "40px",
              boxSizing: "border-box",
            }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "#555",
            }}
          >
            <i className={`fa-solid fa-eye${showPassword ? "-slash" : ""}`}></i>
          </span>
        </div>

        {/* Forgot Password */}
        <div
          style={{
            width: "100%",
            textAlign: "right",
            fontSize: "12px",
            marginTop: "5px",
          }}
        >
          <a
            href="/forgot-password"
            style={{ color: "#001f4d", textDecoration: "none" }}
          >
            Forgot Password?
          </a>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          style={{
            minWidth: "140px",
            padding: "12px 45px",
            marginTop: "16px",
            fontSize: "14px",
            fontWeight: "bold",
            color: "#fff",
            background: "#001f4d",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>

        {/* Divider */}
        <div
          style={{
            margin: "20px 0 10px",
            fontSize: "14px",
            color: "#999",
          }}
        >
          or
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            color: "#444",
            background: "#f2f2f2",
            border: "1px solid #ccc",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google icon"
            style={{ width: "18px", height: "18px" }}
          />
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
