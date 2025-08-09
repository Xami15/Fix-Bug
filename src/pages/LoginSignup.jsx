import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import "./LoginSignup.css";

export default function LoginSignup() {
  const [isActive, setIsActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Background slides with images and videos
  // TODO: Replace these with your professional background images/videos
  // Add your images to the public/ folder and update the src paths below
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
      src: '/background.jpg',
      fallback: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      type: 'gradient',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: 'gradient',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
    // Add your professional images here:
    // {
    //   type: 'image',
    //   src: '/your-professional-image-1.jpg',
    //   fallback: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    // },
    // {
    //   type: 'image',
    //   src: '/your-professional-image-2.jpg',
    //   fallback: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    // },
    // {
    //   type: 'video',
    //   src: '/your-professional-video.mp4',
    //   fallback: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    // }
  ];

  // Auto-slide background every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % backgroundSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundSlides.length]);

  const handleLogin = () => {
    navigate("/dashboard");
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
    <div className="modern-login-signup-container">
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

      {/* Main Auth container */}
      <div className={`auth-container ${isActive ? "activate" : ""}`}>
        <Signup onLogin={handleLogin} isActive={isActive} />
        <Login onLogin={handleLogin} isActive={isActive} />

        {/* Overlay panel */}
        <div className="overlay-panel">
          <div className={`overlay-content ${isActive ? 'active' : ''}`}>
            {/* Left Panel */}
            <div className="overlay-panel-left">
              <h1>Welcome Back!</h1>
              <p>To keep connected with us please login</p>
              <button
                className="overlay-button"
                onClick={() => setIsActive(false)}
              >
                Sign In
              </button>
            </div>

            {/* Right Panel */}
            <div className="overlay-panel-right">
              <h1>Hello, Friend!</h1>
              <p>Enter your details and start your journey with us</p>
              <button
                className="overlay-button"
                onClick={() => setIsActive(true)}
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