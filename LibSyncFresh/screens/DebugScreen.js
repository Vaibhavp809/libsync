import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';

export default function DebugScreen() {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);

  const checkTokenStatus = async () => {
    setLoading(true);
    try {
      const token1 = await AsyncStorage.getItem('token');
      const token2 = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      const userDataLegacy = await AsyncStorage.getItem('userData');
      const apiMode = await AsyncStorage.getItem('api_mode');

      const activeToken = token1 || token2;
      let tokenInfo = null;

      if (activeToken) {
        try {
          const parts = activeToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            tokenInfo = {
              userId: payload.userId || payload.id,
              email: payload.email,
              issuedAt: new Date(payload.iat * 1000).toLocaleString(),
              expiresAt: new Date(payload.exp * 1000).toLocaleString(),
              isExpired: Date.now() > payload.exp * 1000
            };
          }
        } catch (e) {
          tokenInfo = { error: 'Failed to decode token' };
        }
      }

      const user = userData ? JSON.parse(userData) : null;

      setDebugInfo({
        hasToken1: !!token1,
        hasToken2: !!token2,
        tokenPreview: activeToken ? activeToken.substring(0, 30) + '...' : null,
        hasUserData: !!userData,
        hasUserDataLegacy: !!userDataLegacy,
        apiMode,
        user,
        tokenInfo,
        authServiceToken: authService.getToken() ? 'exists' : 'none',
        isAuthenticated: authService.isAuthenticated()
      });
    } catch (error) {
      Alert.alert('Debug Error', error.message);
    }
    setLoading(false);
  };

  const testApiCall = async () => {
    try {
      console.log('Testing API call to /books...');
      const books = await apiService.getBooks();
      Alert.alert('API Test Success', `Loaded ${books.length} books`);
    } catch (error) {
      Alert.alert('API Test Failed', error.message);
    }
  };

  const clearStorage = async () => {
    await AsyncStorage.clear();
    Alert.alert('Storage Cleared', 'All AsyncStorage data cleared');
    checkTokenStatus();
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Debug Information</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Token Status</Text>
        <Text>Has token: {debugInfo.hasToken1 ? '✅' : '❌'}</Text>
        <Text>Has auth_token: {debugInfo.hasToken2 ? '✅' : '❌'}</Text>
        <Text>Token preview: {debugInfo.tokenPreview || 'none'}</Text>
        <Text>AuthService token: {debugInfo.authServiceToken}</Text>
        <Text>Is authenticated: {debugInfo.isAuthenticated ? '✅' : '❌'}</Text>
      </View>

      {debugInfo.tokenInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Details</Text>
          <Text>User ID: {debugInfo.tokenInfo.userId}</Text>
          <Text>Email: {debugInfo.tokenInfo.email}</Text>
          <Text>Issued: {debugInfo.tokenInfo.issuedAt}</Text>
          <Text>Expires: {debugInfo.tokenInfo.expiresAt}</Text>
          <Text>Expired: {debugInfo.tokenInfo.isExpired ? '❌' : '✅'}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Data</Text>
        <Text>Has user_data: {debugInfo.hasUserData ? '✅' : '❌'}</Text>
        <Text>Has userData (legacy): {debugInfo.hasUserDataLegacy ? '✅' : '❌'}</Text>
        {debugInfo.user && (
          <>
            <Text>Name: {debugInfo.user.name}</Text>
            <Text>Student ID: {debugInfo.user.studentID}</Text>
            <Text>Email: {debugInfo.user.email}</Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <Text>API Mode: {debugInfo.apiMode || 'not set'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={checkTokenStatus} disabled={loading}>
          <Text style={styles.buttonText}>Refresh Debug Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testApiCall}>
          <Text style={styles.buttonText}>Test API Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearStorage}>
          <Text style={styles.buttonText}>Clear Storage</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  buttonContainer: {
    marginTop: 20
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  dangerButton: {
    backgroundColor: '#FF3B30'
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold'
  }
});