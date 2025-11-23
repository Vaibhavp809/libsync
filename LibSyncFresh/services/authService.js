import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiConfig } from '../config/apiConfig';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    this.setupAxiosInterceptors();
  }

  // Setup Axios interceptors for automatic token attachment
  setupAxiosInterceptors() {
    // Request interceptor to add token to headers
    axios.interceptors.request.use(
      async (config) => {
        // Get token from memory or AsyncStorage
        let token = this.token;
        if (!token) {
          // Try both token key formats for compatibility
          token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('auth_token');
          if (token) {
            this.token = token;
          }
        }
        
        console.log('Request Interceptor:', {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
        });
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('No token found for authenticated request');
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token expiration
    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        console.error('Response Interceptor Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        
        if (error.response?.status === 401) {
          console.warn('401 Unauthorized - Token expired or invalid');
          // Token expired or invalid, logout user
          await this.logout();
          throw new Error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
          console.warn('403 Forbidden - Access denied');
          throw new Error('Access denied. Please check your permissions.');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Initialize auth service - load saved token and user
  async initialize() {
    try {
      const savedToken = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('auth_token');
      const savedUser = await AsyncStorage.getItem('user_data');
      
      if (savedToken && savedUser) {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
        
        // Restore axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        
        return { token: this.token, user: this.user };
      }
      
      return null;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return null;
    }
  }

  // Login user
  async login(username, password) {
    try {
      const endpoint = await apiConfig.getEndpoint('/auth/login');
      
      // Backend expects 'email' field, but login screen calls it 'username'
      // The username field in our app is actually the email
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data - only if they exist
      if (data.token && data.user) {
        this.token = data.token;
        this.user = data.user;
        
        // Store in AsyncStorage with both token key formats for compatibility
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        // Legacy storage for backward compatibility
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        await AsyncStorage.setItem('api_mode', 'real'); // Switch to real API mode
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        // Send push token to server after successful login
        try {
          const { notificationService } = require('./notificationService');
          let savedToken = await notificationService.getSavedPushToken();
          
          // If no saved token, try to get a new one
          if (!savedToken) {
            console.log('📱 No saved push token found, requesting new one...');
            try {
              savedToken = await notificationService.registerForPushNotificationsAsync();
              if (savedToken) {
                await notificationService.savePushTokenToStorage(savedToken);
                console.log('✅ New push token obtained after login');
              }
            } catch (tokenError) {
              console.warn('⚠️ Could not get push token:', tokenError.message);
            }
          }
          
          // Send token to server if we have one
          if (savedToken) {
            console.log('📤 Sending push token to server after login...');
            await notificationService.sendPushTokenToServer(savedToken);
            console.log('✅ Push token sent to server after login');
          } else {
            console.warn('⚠️ No push token available - user may need to grant notification permissions');
            console.warn('⚠️ Push notifications will not work until permissions are granted');
          }
        } catch (pushError) {
          console.error('❌ Failed to send push token after login:', pushError.message);
          console.error('❌ Error details:', pushError);
          // Don't fail login if push token send fails
        }
      } else {
        throw new Error('Invalid response: missing token or user data');
      }

      return {
        success: true,
        token: this.token,
        user: this.user
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Register user
  async register(userData) {
    try {
      const endpoint = await apiConfig.getEndpoint('/auth/register');
      
      // Map frontend fields to backend expected format
      const backendData = {
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        password: userData.password,
        role: 'student',
        studentID: userData.studentId,
        department: userData.department || 'General' // Default department if not provided
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store token and user data - only if they exist
      if (data.token && data.user) {
        this.token = data.token;
        this.user = data.user;
        
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        // Legacy storage for backward compatibility
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        await AsyncStorage.setItem('api_mode', 'real'); // Switch to real API mode
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      } else {
        throw new Error('Invalid response: missing token or user data');
      }

      return {
        success: true,
        token: this.token,
        user: this.user
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      this.token = null;
      this.user = null;
      
      // Clear stored data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('userData'); // Legacy storage
      // Keep api_mode setting as user preference
      
      // Remove axios default header
      delete axios.defaults.headers.common['Authorization'];
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current auth token
  getToken() {
    return this.token;
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.token && this.user);
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    if (!this.token) {
      throw new Error('No authentication token available');
    }
    
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  // Make authenticated API call
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const fullURL = await apiConfig.getEndpoint(endpoint);
      console.log('Making authenticated request to:', fullURL);
      
      const config = {
        method,
        headers: this.getAuthHeaders(),
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(fullURL, config);
      
      if (response.status === 401) {
        // Token expired, logout user
        await this.logout();
        throw new Error('Session expired. Please login again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Authenticated API call failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();