import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../authService";
import { supabase } from "../utils/supabase";
import { getAuth } from "firebase/auth";

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
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('GitHub authentication successful!');
    } catch (error) {
      alert('GitHub authentication failed');
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

  return (
    <div style={styles.container}>
      <div style={styles.backgroundShapes}>
        <div style={{...styles.shape, ...styles.shape1}}></div>
        <div style={{...styles.shape, ...styles.shape2}}></div>
        <div style={{...styles.shape, ...styles.shape3}}></div>
        <div style={{...styles.shape, ...styles.shape4}}></div>
      </div>
      
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
            <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"/>
            <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
          </svg>
        </div>
      </div>

      <div style={styles.authCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome</h1>
          <p style={styles.subtitle}>
            Sign in to your account or create a new one
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              ...styles.tab,
              ...(isLogin ? styles.activeTab : styles.inactiveTab)
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              ...styles.tab,
              ...(!isLogin ? styles.activeTab : styles.inactiveTab)
            }}
          >
            Sign Up
          </button>
        </div>

        <div onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={styles.inputWithIcon}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                style={styles.inputWithIcon}
                placeholder="Enter your password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  style={styles.inputWithIcon}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {isLogin && (
            <div style={styles.forgotPassword}>
              <a href="/forgot-password" style={styles.forgotLink}>
                Forgot your password?
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              ...styles.submitButton,
              ...(isLoading ? styles.submitButtonLoading : {})
            }}
          >
            {isLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR CONTINUE WITH</span>
        </div>

        <div style={styles.socialButtons}>
          <button 
            onClick={handleGoogleAuth}
            disabled={isLoading || gLoading}
            style={{...styles.socialButton, ...styles.googleButton}}
          >
            {gLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          
          <button 
            onClick={handleGitHubAuth}
            disabled={isLoading}
            style={{...styles.socialButton, ...styles.githubButton}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #6366F1 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  
  backgroundShapes: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1
  },
  
  shape: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    animation: 'float 8s ease-in-out infinite'
  },
  
  shape1: {
    width: '400px',
    height: '400px',
    top: '-200px',
    left: '-200px',
    animationDelay: '0s'
  },
  
  shape2: {
    width: '300px',
    height: '300px',
    top: '20%',
    right: '-150px',
    animationDelay: '2s'
  },
  
  shape3: {
    width: '200px',
    height: '200px',
    bottom: '-100px',
    left: '20%',
    animationDelay: '4s'
  },
  
  shape4: {
    width: '150px',
    height: '150px',
    bottom: '30%',
    right: '10%',
    animationDelay: '6s'
  },

  logo: {
    marginBottom: '32px',
    zIndex: 3,
    position: 'relative'
  },

  logoIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.8)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },

  authCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    position: 'relative',
    zIndex: 2,
    animation: 'slideUp 0.8s ease-out'
  },

  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },

  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 8px 0'
  },

  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    lineHeight: '1.5'
  },

  tabContainer: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '24px'
  },

  tab: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'transparent'
  },

  activeTab: {
    background: '#8B5CF6',
    color: 'white',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
  },

  inactiveTab: {
    color: 'rgba(255, 255, 255, 0.7)'
  },

  form: {
    marginBottom: '20px'
  },

  inputGroup: {
    marginBottom: '16px'
  },

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '6px'
  },

  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },

  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box',
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },

  inputWithIcon: {
    width: '100%',
    padding: '14px 16px 14px 44px',
    fontSize: '14px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box',
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },

  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    zIndex: 1,
    pointerEvents: 'none'
  },

  eyeIcon: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '0'
  },

  submitButton: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    background: '#8B5CF6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },

  submitButtonLoading: {
    background: 'rgba(139, 92, 246, 0.6)',
    cursor: 'not-allowed'
  },

  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '24px 0 20px 0'
  },

  dividerText: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
    padding: '0 12px',
    fontSize: '11px',
    fontWeight: '500',
    position: 'relative',
    letterSpacing: '0.5px'
  },

  socialButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },

  socialButton: {
    flex: 1,
    padding: '12px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)'
  },

  googleButton: {
    color: 'white'
  },

  githubButton: {
    color: 'white'
  },

  footer: {
    textAlign: 'center'
  },

  footerText: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
    lineHeight: '1.4'
  }
};

// Add CSS animations and enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
    25% { transform: translateY(-20px) rotate(90deg); opacity: 0.8; }
    50% { transform: translateY(0px) rotate(180deg); opacity: 0.5; }
    75% { transform: translateY(10px) rotate(270deg); opacity: 0.8; }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  input:focus {
    border-color: rgba(255, 255, 255, 0.4) !important;
    background: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
  }
  
  input::placeholder {
    color: rgba(255, 255, 255, 0.5) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  .social-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
  }
  
  /* Enhanced glassmorphism effects */
  *::-webkit-scrollbar {
    display: none;
  }
  
  /* Add subtle glow effects */
  .submit-button:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4) !important;
  }
`;
document.head.appendChild(styleSheet);

export default AuthPage;