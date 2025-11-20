import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Utility function to decode JWT token (without verification - backend handles verification)
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

export default function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Ensure body class is set immediately for 80% scale on admin pages
  useEffect(() => {
    // Remove home-page and login-page classes (admin pages should have no class = 80% scale)
    document.body.classList.remove('home-page', 'login-page');
    document.documentElement.classList.remove('home-page', 'login-page');
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      // Check localStorage first (for "Remember Me" users)
      // Then check sessionStorage (for current session users)
      let token = localStorage.getItem('adminToken');
      let storageType = 'localStorage';
      
      if (!token) {
        token = sessionStorage.getItem('adminToken');
        storageType = 'sessionStorage';
      }
      
      if (!token) {
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // Decode token to check expiration and role
      const decoded = decodeToken(token);
      
      if (!decoded) {
        // Invalid token format, clear and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(decoded)) {
        // Token expired, clear and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // Verify admin role
      if (decoded.role !== 'admin') {
        // Not an admin, clear and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      // Token is valid and user is admin
      setIsValid(true);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    // Show loading state while checking
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Verifying authentication...
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
