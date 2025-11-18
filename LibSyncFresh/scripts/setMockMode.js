// Utility script to set the app to mock mode
// Run this in React Native debugger console or use it to understand the process

import AsyncStorage from '@react-native-async-storage/async-storage';

export const enableMockMode = async () => {
  try {
    await AsyncStorage.setItem('api_mode', 'mock');
    console.log('✅ Mock mode enabled successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to enable mock mode:', error);
    return false;
  }
};

export const disableMockMode = async () => {
  try {
    await AsyncStorage.removeItem('api_mode');
    console.log('✅ Mock mode disabled - using real API');
    return true;
  } catch (error) {
    console.error('❌ Failed to disable mock mode:', error);
    return false;
  }
};

export const checkCurrentMode = async () => {
  try {
    const mode = await AsyncStorage.getItem('api_mode');
    console.log(`📋 Current API mode: ${mode || 'real API'}`);
    return mode;
  } catch (error) {
    console.error('❌ Failed to check API mode:', error);
    return null;
  }
};

// If running directly in debugger console:
// enableMockMode();
