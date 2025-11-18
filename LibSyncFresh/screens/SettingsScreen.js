import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { apiConfig } from '../config/apiConfig';

export default function SettingsScreen({ navigation }) {
  const [serverIP, setServerIP] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const currentIP = await apiConfig.getCurrentServerIP();
      setServerIP(currentIP);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleResetToProduction = async () => {
    setLoading(true);
    try {
      const newBaseURL = await apiConfig.resetServerConfig();
      const newIP = await apiConfig.getCurrentServerIP();
      setServerIP(newIP);
      Alert.alert('Success', `Reset to production server: ${newIP}`);
    } catch (error) {
      Alert.alert('Reset Failed', 'Could not reset to production server.');
    }
    setLoading(false);
  };

  const handleManualSave = async () => {
    if (!serverIP.trim()) {
      Alert.alert('Error', 'Please enter a server IP address');
      return;
    }

    setTesting(true);
    const success = await apiConfig.setServerIP(serverIP.trim());
    if (success) {
      Alert.alert('Success', `Server IP set to ${serverIP.trim()}`);
    }
    setTesting(false);
  };

  const handleTestConnection = async () => {
    if (!serverIP.trim()) {
      Alert.alert('Error', 'Please enter a server IP address');
      return;
    }

    setTesting(true);
    try {
      // Handle both IP addresses and full URLs
      let testURL;
      if (serverIP.trim().startsWith('http://') || serverIP.trim().startsWith('https://')) {
        // It's a full URL (production)
        testURL = `${serverIP.trim()}/api/health`;
      } else {
        // It's an IP address (local development)
        testURL = `http://${serverIP.trim()}:5000/api/health`;
      }
      
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

      if (response.ok) {
        Alert.alert('Connection Test', 'Successfully connected to server!');
      } else {
        Alert.alert('Connection Test', 'Server responded but may not be functioning correctly');
      }
    } catch (error) {
      Alert.alert('Connection Test', `Failed to connect: ${error.message}`);
    }
    setTesting(false);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset server configuration and attempt auto-detection. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: handleAutoDetect },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Server Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Auto-detect server</Text>
          <Switch
            value={autoDetect}
            onValueChange={setAutoDetect}
          />
        </View>

        {autoDetect ? (
          <View style={styles.autoSection}>
            <Text style={styles.description}>
              The app uses the production server by default. Click below to reset to production.
            </Text>
            <Button
              title={loading ? 'Resetting...' : 'Reset to Production'}
              onPress={handleResetToProduction}
              disabled={loading}
            />
            {loading && <ActivityIndicator style={styles.loader} />}
          </View>
        ) : (
          <View style={styles.manualSection}>
            <Text style={styles.label}>Server URL or IP Address:</Text>
            <TextInput
              style={styles.input}
              value={serverIP}
              onChangeText={setServerIP}
              placeholder="e.g., https://libsync-o0s8.onrender.com or 192.168.1.100"
              keyboardType="default"
            />
            
            <View style={styles.buttonRow}>
              <Button
                title={testing ? 'Testing...' : 'Test Connection'}
                onPress={handleTestConnection}
                disabled={testing}
              />
              <Button
                title="Save"
                onPress={handleManualSave}
                disabled={testing}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Configuration</Text>
        <Text style={styles.info}>Server URL: {serverIP || 'https://libsync-o0s8.onrender.com'}</Text>
      </View>

      <View style={styles.section}>
        <Button
          title="Reset to Defaults"
          onPress={resetToDefaults}
          color="#ff6b6b"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.helpTitle}>Help</Text>
        <Text style={styles.helpText}>
          • The app uses the production server by default{'\n'}
          • For local development, enter your server's IP address (e.g., 192.168.1.100){'\n'}
          • For production, enter the full URL (e.g., https://libsync-o0s8.onrender.com){'\n'}
          • Local IP addresses will use port 5000 automatically
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  autoSection: {
    alignItems: 'center',
  },
  manualSection: {
    marginTop: 10,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  loader: {
    marginTop: 10,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
