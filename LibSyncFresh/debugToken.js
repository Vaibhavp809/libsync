// Token Debugging Script for LibSync React Native App
import AsyncStorage from '@react-native-async-storage/async-storage';

async function debugTokenStatus() {
  console.log('🔍 Debugging Token Status...\n');

  try {
    // Check all possible token storage locations
    const token1 = await AsyncStorage.getItem('token');
    const token2 = await AsyncStorage.getItem('auth_token');
    const userData = await AsyncStorage.getItem('user_data');
    const userDataLegacy = await AsyncStorage.getItem('userData');
    const apiMode = await AsyncStorage.getItem('api_mode');

    console.log('📱 AsyncStorage Contents:');
    console.log('  token:', token1 ? `${token1.substring(0, 20)}...` : 'null');
    console.log('  auth_token:', token2 ? `${token2.substring(0, 20)}...` : 'null');
    console.log('  user_data:', userData ? 'exists' : 'null');
    console.log('  userData (legacy):', userDataLegacy ? 'exists' : 'null');
    console.log('  api_mode:', apiMode);

    // Parse user data
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('\n👤 User Data:');
        console.log('  ID:', user._id || user.id);
        console.log('  Name:', user.name);
        console.log('  Email:', user.email);
        console.log('  Student ID:', user.studentID);
      } catch (e) {
        console.log('❌ Failed to parse user_data:', e.message);
      }
    }

    // Check if we have a valid token
    const activeToken = token1 || token2;
    if (activeToken) {
      console.log('\n✅ Token found - attempting to decode...');
      
      // Try to decode JWT (basic decode without verification)
      try {
        const parts = activeToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('📄 Token Payload:');
          console.log('  User ID:', payload.userId || payload.id);
          console.log('  Email:', payload.email);
          console.log('  Issued At:', new Date(payload.iat * 1000).toLocaleString());
          console.log('  Expires At:', new Date(payload.exp * 1000).toLocaleString());
          console.log('  Is Expired:', Date.now() > payload.exp * 1000);
        }
      } catch (e) {
        console.log('❌ Failed to decode token:', e.message);
      }
    } else {
      console.log('\n❌ No token found in storage');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!activeToken) {
      console.log('  1. User needs to log in to get a token');
      console.log('  2. Check login flow is working correctly');
    } else {
      console.log('  1. Token exists - check if backend accepts this token format');
      console.log('  2. Verify token is being sent in Authorization header');
      console.log('  3. Check if token is expired and needs refresh');
    }

  } catch (error) {
    console.error('💥 Debug script failed:', error.message);
  }
}

// For React Native environment, we need to use a different approach
// This function can be called from the app
export { debugTokenStatus };

console.log('Token debug script loaded. Call debugTokenStatus() to run diagnostics.');