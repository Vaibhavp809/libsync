// Simple test script to check server connection
import { apiConfig } from './config/apiConfig';

const testConnection = async () => {
  try {
    console.log('Testing server connection...');
    
    // Try to set server IP to localhost
    const success = await apiConfig.setServerIP('127.0.0.1');
    if (success) {
      console.log('Successfully connected to localhost:5000');
    } else {
      console.log('Failed to connect to localhost:5000');
    }
    
    // Get current base URL
    const baseURL = await apiConfig.getBaseURL();
    console.log('Current base URL:', baseURL);
    
    // Test making a simple API call
    const endpoint = await apiConfig.getEndpoint('/health');
    console.log('Health endpoint:', endpoint);
    
    const response = await fetch(endpoint);
    const data = await response.json();
    console.log('Health check response:', data);
    
  } catch (error) {
    console.error('Connection test failed:', error);
  }
};

export { testConnection };