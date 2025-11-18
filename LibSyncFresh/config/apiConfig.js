import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class ApiConfig {
  constructor() {
    this.baseURL = null;
    this.port = '5000';
    this.defaultIPs = [
      '127.0.0.1',       // localhost first (for local development)
      'localhost',       // localhost alias
      '10.0.2.2',        // Android emulator host access
      '172.22.132.218',
      '10.98.30.218',,'172.27.125.74',    // Your current network IP
      '192.168.1.131',   // Your existing server IP
      '172.19.139.218', 
      '172.22.132.21',
      '10.76.154.74', // Your existing server IP
    ];
    
    // Flag to track if we've expanded the IP list
    this.expandedIPs = false;
  }

  // Get stored server IP or detect automatically
  async getBaseURL() {
    // Always try to auto-detect first
    console.log('Attempting to auto-detect server...');
    const detectedIP = await this.autoDetectServer();
    if (detectedIP) {
      this.baseURL = `http://${detectedIP}:${this.port}`;
      console.log('Auto-detected server at:', this.baseURL);
      await AsyncStorage.setItem('server_ip', detectedIP);
      return this.baseURL;
    }

    // If auto-detection fails, try stored IP as fallback
    try {
      const storedIP = await AsyncStorage.getItem('server_ip');
      console.log('Falling back to stored IP from AsyncStorage:', storedIP);
      if (storedIP) {
        this.baseURL = `http://${storedIP}:${this.port}`;
        console.log('Using stored IP, baseURL set to:', this.baseURL);
        return this.baseURL;
      }
    } catch (error) {
      console.log('No stored IP found:', error.message);
    }

    // If both auto-detect and stored IP fail, use default IP
    console.log('Both auto-detection and stored IP failed, using default IP...');

    // Fallback to first default IP
    console.log('Auto-detection failed, using fallback IP:', this.defaultIPs[0]);
    this.baseURL = `http://${this.defaultIPs[0]}:${this.port}`;
    console.log('Fallback baseURL set to:', this.baseURL);
    return this.baseURL;
  }

  // Get local network IP addresses for testing
  expandIPList() {
    if (this.expandedIPs) return;
    
    try {
      // Try to get local network IP ranges
      const commonRanges = [
        '192.168.1.',   // Most common home router range
        '192.168.0.',   // Another common range
        '10.0.0.',      // Corporate/VPN range
        '172.16.',      // Another private range
      ];
      
      // Add common IPs from each range
      commonRanges.forEach(range => {
        [1, 100, 101, 102, 103, 104, 105].forEach(last => {
          const ip = `${range}${last}`;
          if (!this.defaultIPs.includes(ip)) {
            this.defaultIPs.push(ip);
          }
        });
      });
      
      this.expandedIPs = true;
    } catch (error) {
      console.log('Could not expand IP ranges:', error.message);
    }
  }

  // Auto-detect server by testing multiple IPs
  async autoDetectServer() {
    console.log('Auto-detecting server...');
    
    // Expand IP list before testing
    this.expandIPList();
    
    for (const ip of this.defaultIPs) {
      try {
        const testURL = `http://${ip}:${this.port}/api/health`;
        
        // Simple fetch with basic timeout for React Native compatibility
        let timeoutId;
        const fetchPromise = fetch(testURL, {
          method: 'GET',
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), 3000);
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`Server found at ${ip}`);
          return ip;
        }
      } catch (error) {
        console.log(`Failed to connect to ${ip}: ${error.message}`);
        continue;
      }
    }
    
    console.log('No server auto-detected');
    return null;
  }

  // Manually set server IP
  async setServerIP(ip) {
    try {
      // Validate IP format
      if (!this.isValidIP(ip)) {
        throw new Error('Invalid IP address format');
      }

      // Test connection
      const testURL = `http://${ip}:${this.port}/api/health`;
      
      // Simple fetch with basic timeout for React Native compatibility
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
      this.baseURL = `http://${ip}:${this.port}`;
      await AsyncStorage.setItem('server_ip', ip);
      return true;
    } catch (error) {
      Alert.alert('Connection Error', `Failed to connect to ${ip}: ${error.message}`);
      return false;
    }
  }

  // Get current server IP
  async getCurrentServerIP() {
    const storedIP = await AsyncStorage.getItem('server_ip');
    return storedIP || this.defaultIPs[0];
  }

  // Reset to auto-detection
  async resetServerConfig() {
    await AsyncStorage.removeItem('server_ip');
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
