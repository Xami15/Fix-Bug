import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../authService";
import { supabase } from "../utils/supabase";
import { getAuth } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import './auth.css';

const AuthPage = ({ onLogin, isActive }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Background slides with images and videos
  // Professional background images for authentication
  const backgroundSlides = [
    {
      type: 'video',
      src: '/engine-animation.mp4',
      fallback: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: 'video',
      src: '/videos/induction-motor-operation.mp4.mp4',
      fallback: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      type: 'image',
      src: '/auth-backgrounds/industrial-motor-1.jpg',
      fallback: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      type: 'image',
      src: '/auth-backgrounds/industrial-motor-2.jpg',
      fallback: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: 'image',
      src: '/auth-backgrounds/industrial-motor-3.jpg',
      fallback: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      type: 'gradient',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: 'gradient',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ];

  // Auto-slide background every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % backgroundSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundSlides.length]);

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Handle email login
        await loginWithEmail(formData.email, formData.password);
        const user = getAuth().currentUser;

        if (user) await storeUserIfNew(user);

        localStorage.setItem("token", "loggedin");
        if (onLogin) onLogin();
        navigate("/dashboard", { replace: true });
      } else {
        // Handle sign up - you can implement this similar to login
        // For now, showing alert as placeholder
        alert('Sign up functionality to be implemented');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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

  const handleGitHubAuth = async () => {
    setIsLoading(true);
    
    try {
      // GitHub auth implementation
      alert('GitHub authentication to be implemented');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    });
  };

  const renderBackgroundSlide = (slide, index) => {
    const isActive = index === currentSlide;
    
    if (slide.type === 'video') {
      return (
        <div
          key={index}
          className={`background-slide ${isActive ? 'active' : ''}`}
          style={{
            background: slide.fallback
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 1s ease-in-out'
            }}
            onError={(e) => {
              console.error("Video loading error:", e);
              e.target.style.display = 'none';
            }}
          >
            <source src={slide.src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (slide.type === 'image') {
      return (
        <div
          key={index}
          className={`background-slide ${isActive ? 'active' : ''}`}
          style={{
            background: `url(${slide.src}) center/cover no-repeat`,
            backgroundFallback: slide.fallback
          }}
        />
      );
    } else if (slide.type === 'gradient') {
      return (
        <div
          key={index}
          className={`background-slide ${isActive ? 'active' : ''}`}
          style={{
            background: slide.gradient
          }}
        />
      );
    }
  };

  return (
    <div className="modern-auth-container">
      {/* Background Slides */}
      <div className="background-carousel">
        {backgroundSlides.map((slide, index) => renderBackgroundSlide(slide, index))}
      </div>

      {/* Dark overlay */}
      <div className="auth-overlay" />

      {/* Slide indicators */}
      <div className="slide-indicators">
        {backgroundSlides.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>

      {/* Auth Content */}
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Sign in to your SEP Monitoring Dashboard' 
                : 'Join SEP Monitoring Dashboard and start monitoring your motors'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
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

            {!isLogin && (
              <div className="form-group">
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="auth-button primary"
            >
              {isLoading ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="social-auth-buttons">
            <button
              onClick={handleGoogleAuth}
              disabled={gLoading}
              className="auth-button social google"
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

            <button
              onClick={handleGitHubAuth}
              disabled={isLoading}
              className="auth-button social github"
            >
              {isLoading ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                <>
                  <FaGithub className="social-icon" />
                  Continue with GitHub
                </>
              )}
            </button>
          </div>

          <div className="auth-footer">
            <p className="toggle-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleMode}
                className="toggle-button"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;