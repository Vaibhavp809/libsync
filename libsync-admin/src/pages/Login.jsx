import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Utility function to decode JWT token
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Check if token is expired
  const isTokenExpired = (decodedToken) => {
    if (!decodedToken || !decodedToken.exp) {
      return true;
    }
    const currentTime = Date.now() / 1000;
    return decodedToken.exp < currentTime;
  };

  useEffect(() => {
    // Only check localStorage for "Remember Me" users
    // sessionStorage tokens are NOT checked here because they should clear on browser close
    // If user didn't check "Remember Me", they should login fresh each time
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      // No "remember me" token, ensure sessionStorage is also clear
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      return;
    }

    // Validate the token before auto-login
    const decoded = decodeToken(token);
    
    if (!decoded) {
      // Invalid token format, clear it
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      return;
    }

    // Check if token is expired
    if (isTokenExpired(decoded)) {
      // Token expired, clear it
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      return;
    }

    // Verify admin role
    if (decoded.role !== 'admin') {
      // Not an admin, clear token
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      return;
    }

    // Token is valid, not expired, and user is admin - auto-login
    navigate('/dashboard');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Use environment variable for API URL or default to Render production URL
      // In Vite, environment variables must be prefixed with VITE_ and accessed via import.meta.env
      const API_URL = import.meta.env.VITE_API_URL || 'https://libsync-o0s8.onrender.com/api';
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (!response.data.token) {
        throw new Error('No token received from server');
      }

      // Verify admin role
      if (!response.data.user || response.data.user.role !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      // Store tokens based on rememberMe preference
      const token = response.data.token;
      const userData = JSON.stringify(response.data.user);
      
      if (rememberMe) {
        // Store in localStorage (persists across sessions)
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', userData);
        // Clear sessionStorage to avoid conflicts
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
      } else {
        // Store in sessionStorage only (clears when browser closes)
        sessionStorage.setItem('adminToken', token);
        sessionStorage.setItem('adminUser', userData);
        // Clear localStorage to avoid conflicts
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }

      // Redirect to dashboard (force reload to remount app)
      window.location.replace('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container} className="login-container">
      {/* Return to Home Button */}
      <Link to="/" style={styles.homeButton} className="return-home-button">
        <span style={styles.homeButtonIcon}>←</span>
        <span style={styles.homeButtonText}>Return to Home</span>
      </Link>
      
      {/* Background Animation */}
      <div style={styles.backgroundAnimation}>
        <div style={styles.floatingShape}></div>
        <div style={styles.floatingShape2}></div>
        <div style={styles.floatingShape3}></div>
      </div>

      {/* Main Content */}
      <div style={styles.content} className="login-content">
        {/* Left Panel - Branding */}
        <div style={styles.brandPanel} className="login-brand-panel">
          <div style={styles.brandContent}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon} className="login-logo-icon">📚</div>
              <h1 style={styles.brandTitle} className="login-brand-title">LibSync</h1>
            </div>
            <p style={styles.brandSubtitle} className="login-brand-subtitle">
              Modern Library Management System
            </p>
            <div style={styles.featureList}>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🚀</span>
                <span>Streamlined Operations</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📱</span>
                <span>QR Attendance System</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📊</span>
                <span>Real-time Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div style={styles.formPanel} className="login-form-panel">
          <div style={styles.formContainer} className="login-form-container">
            <div style={styles.formHeader} className="login-form-header">
              <h2 style={styles.formTitle} className="login-form-title">Welcome Back</h2>
              <p style={styles.formSubtitle} className="login-form-subtitle">
                Sign in to access your library dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Remember Me
                </label>
              </div>
              {error && (
                <div style={styles.errorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {error}
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={styles.input}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={styles.input}
                    className="login-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-button"
                style={{
                  ...styles.submitButton,
                  ...(isLoading && styles.submitButtonLoading)
                }}
              >
                {isLoading ? (
                  <>
                    <div style={styles.spinner}></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div style={styles.formFooter}>
              <p style={styles.footerText}>
                Secure access to your library management system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden'
  },
  backgroundAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  floatingShape: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '100px',
    height: '100px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    animation: 'float 6s ease-in-out infinite'
  },
  floatingShape2: {
    position: 'absolute',
    top: '60%',
    right: '15%',
    width: '80px',
    height: '80px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '30%',
    animation: 'float 8s ease-in-out infinite reverse'
  },
  floatingShape3: {
    position: 'absolute',
    bottom: '20%',
    left: '20%',
    width: '60px',
    height: '60px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '50%',
    animation: 'float 7s ease-in-out infinite'
  },
  content: {
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
    zIndex: 1
  },
  brandPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    color: 'white',
    padding: '60px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  brandContent: {
    textAlign: 'center',
    maxWidth: '400px'
  },
  logoContainer: {
    marginBottom: '30px'
  },
  logoIcon: {
    fontSize: '80px',
    marginBottom: '20px',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
  },
  brandTitle: {
    fontSize: '48px',
    fontWeight: '800',
    margin: 0,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
  },
  brandSubtitle: {
    fontSize: '18px',
    color: '#94a3b8',
    marginBottom: '40px',
    fontWeight: '500'
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '16px',
    color: '#cbd5e1'
  },
  featureIcon: {
    fontSize: '24px'
  },
  formPanel: {
    flex: 1,
    padding: '60px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px'
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  formTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 10px 0'
  },
  formSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  errorMessage: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '18px',
    color: '#9ca3af',
    zIndex: 1
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 48px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    background: 'white'
  },
  passwordToggle: {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  submitButtonLoading: {
    opacity: 0.8,
    cursor: 'not-allowed'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  formFooter: {
    textAlign: 'center',
    marginTop: '30px'
  },
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  homeButton: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
    color: '#667eea',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.25), 0 2px 8px rgba(118, 75, 162, 0.2)',
    zIndex: 9999,
    border: '2px solid rgba(102, 126, 234, 0.3)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  homeButtonIcon: {
    fontSize: '20px',
    transition: 'transform 0.3s ease',
    display: 'inline-block'
  },
  homeButtonText: {
    transition: 'opacity 0.3s ease'
  }
};
