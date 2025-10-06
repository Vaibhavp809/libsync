import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/apiConfig';
import { mockApi } from '../config/mockApiConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            // Try real API first
            try {
                const endpoint = await apiConfig.getEndpoint('/auth/login');
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // Store token and user data
                await AsyncStorage.setItem('token', data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(data.user));
                await AsyncStorage.setItem('api_mode', 'real');

                navigation.navigate("Home");
                return;
            } catch (apiError) {
                console.log('Real API failed, trying mock API:', apiError.message);
                
                // Use mock API as fallback
                const mockResult = await mockApi.login(email, password);
                
                // Store token and user data
                await AsyncStorage.setItem('token', mockResult.token);
                await AsyncStorage.setItem('userData', JSON.stringify(mockResult.user));
                await AsyncStorage.setItem('api_mode', 'mock');
                
                Alert.alert(
                    'Demo Mode', 
                    'Connected to demo server. Try logging in with:\nUsername: testuser\nPassword: password123',
                    [{ text: 'OK' }]
                );

                navigation.navigate("Home");
            }
        } catch (err) {
            console.error('Login error:', err);
            Alert.alert(
                'Login Failed', 
                err.message || 'Invalid credentials. For demo mode, try:\nUsername: testuser\nPassword: password123',
                [
                    { text: 'OK' },
                    { text: 'Demo Login', onPress: () => { setEmail('testuser'); setPassword('password123'); } }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LibSync Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button 
        title={loading ? "Signing in..." : "Login"} 
        onPress={handleLogin} 
        disabled={loading}
      />
      {loading && <ActivityIndicator style={styles.loader} />}
      <Text onPress={() => navigation.navigate('Register')} style={styles.link}>
        Don't have an account? Register
      </Text>
      <Text onPress={() => navigation.navigate('Settings')} style={styles.settingsLink}>
        Settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { height: 40, borderBottomWidth: 1, marginBottom: 20 },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  link: { marginTop: 20, textAlign: 'center', color: 'blue' },
  settingsLink: { marginTop: 10, textAlign: 'center', color: 'gray', fontSize: 12 },
  loader: { marginTop: 10 },
});
