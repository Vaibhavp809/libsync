import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class ApiConfig {
  constructor() {
    this.baseURL = null;
    // Production Render URL (HTTPS)
    this.productionURL = 'https://libsync-o0s8.onrender.com';
  }

  // Get base URL - uses production URL by default, or custom URL if set
  async getBaseURL() {
    // Check if a custom URL/IP is stored (for development/testing)
    try {
      const storedURL = await AsyncStorage.getItem('server_ip');
      if (storedURL) {
        // Check if stored value is a full URL (production) or IP address (local)
        if (storedURL.startsWith('http://') || storedURL.startsWith('https://')) {
          this.baseURL = storedURL;
          console.log('Using stored custom URL:', this.baseURL);
          return this.baseURL;
        } else {
          // Legacy IP address format - convert to HTTP URL
          this.baseURL = `http://${storedURL}:5000`;
          console.log('Using stored IP address:', this.baseURL);
          return this.baseURL;
        }
      }
    } catch (error) {
      console.log('Error reading stored URL:', error.message);
    }

    // Default to production URL
    this.baseURL = this.productionURL;
    console.log('Using production Render URL:', this.baseURL);
    return this.baseURL;
  }


  // Manually set server URL (for development/testing)
  async setServerIP(ipOrUrl) {
    try {
      let testURL;
      let baseURL;
      
      // Check if it's a full URL (production) or IP address
      if (ipOrUrl.startsWith('http://') || ipOrUrl.startsWith('https://')) {
        // It's a full URL
        testURL = `${ipOrUrl}/api/health`;
        baseURL = ipOrUrl;
      } else {
        // It's an IP address (local development) - convert to HTTP URL
        if (!this.isValidIP(ipOrUrl)) {
          throw new Error('Invalid IP address format');
        }
        testURL = `http://${ipOrUrl}:5000/api/health`;
        baseURL = `http://${ipOrUrl}:5000`;
      }
      
      // Test connection
      let timeoutId;
      const fetchPromise = fetch(testURL, {
        method: 'GET',
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Cannot connect to server');
      }

      // Save if successful
      this.baseURL = baseURL;
      await AsyncStorage.setItem('server_ip', ipOrUrl);
      return true;
    } catch (error) {
      Alert.alert('Connection Error', `Failed to connect to ${ipOrUrl}: ${error.message}`);
      return false;
    }
  }

  // Get current server URL/IP
  async getCurrentServerIP() {
    try {
      const storedURL = await AsyncStorage.getItem('server_ip');
      return storedURL || this.productionURL;
    } catch (error) {
      return this.productionURL;
    }
  }

  // Reset to production URL
  async resetServerConfig() {
    await AsyncStorage.removeItem('server_ip');
    await AsyncStorage.removeItem('use_production_api');
    this.baseURL = null;
    return await this.getBaseURL();
  }

  // Validate IP address format
  isValidIP(ip) {
    // Handle localhost alias
    if (ip === 'localhost') return true;
    
    // Simple IP validation for React Native compatibility
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) return false;
    }
    
    return true;
  }

  // Get full API endpoint
  async getEndpoint(path) {
    const baseURL = await this.getBaseURL();
    // Handle paths that already start with /api
    if (path.startsWith('/api/')) {
      return `${baseURL}${path}`;
    }
    return `${baseURL}/api${path}`;
  }
}

// Export singleton instance
export const apiConfig = new ApiConfig();

// Helper function for making API calls with automatic base URL
export const makeApiCall = async (method, endpoint, data = null, headers = {}) => {
  try {
    const fullURL = await apiConfig.getEndpoint(endpoint);
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(fullURL, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
