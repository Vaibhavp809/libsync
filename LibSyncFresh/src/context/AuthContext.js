import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const authData = await authService.initialize();
      if (authData && authData.user) {
        setUser(authData.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return result;
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const result = await authService.register(userData);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return result;
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if logout fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};