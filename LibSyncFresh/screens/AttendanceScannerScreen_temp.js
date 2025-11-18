import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  Button, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/apiConfig';

export default function AttendanceScannerScreen({ navigation }) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    (async () => {
      // Get user info from storage
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    })();
  }, []);

  const handleManualScan = async () => {
    if (!qrCode.trim()) {
      Alert.alert("Error", "Please enter the QR code data");
      return;
    }

    setLoading(true);
    
    try {
      // Check if user is logged in
      if (!userInfo || !userInfo._id) {
        Alert.alert(
          "Login Required", 
          "Please log in to record attendance.",
          [{ text: "OK" }]
        );
        return;
      }

      // Send scan data to backend
      const endpoint = await apiConfig.getEndpoint('/attendance/scan');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: qrCode,
          studentId: userInfo._id
        }),
      });
      
      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const result = responseData.data;
        setLastScanResult({
          action: result.action,
          studentName: result.studentName,
          time: new Date(result.time).toLocaleTimeString(),
          success: true
        });
        
        Alert.alert(
          "Attendance Recorded!", 
          `Successfully recorded ${result.action} for ${result.studentName}`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(responseData.message || 'Attendance recording failed');
      }
    } catch (error) {
      console.error('Scan error:', error);
      
      let errorMessage = "Failed to record attendance";
      if (error.message) {
        errorMessage = error.message;
      }
      
      setLastScanResult({
        action: 'Error',
        studentName: 'N/A',
        time: new Date().toLocaleTimeString(),
        success: false,
        error: errorMessage
      });
      
      Alert.alert("Scan Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setQrCode('');
    setLastScanResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Attendance Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Enter the daily QR code to record your attendance
        </Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter QR code data"
          value={qrCode}
          onChangeText={setQrCode}
          multiline={true}
          numberOfLines={3}
        />
        
        <TouchableOpacity 
          style={[styles.scanButton, loading && styles.scanButtonDisabled]}
          onPress={handleManualScan}
          disabled={loading}
        >
          <Text style={styles.scanButtonText}>
            {loading ? "Processing..." : "Record Attendance"}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          📍 Ask librarian for the current QR code data
        </Text>
        <Text style={styles.instructionText}>
          🔄 First scan = Login, Second scan = Logout
        </Text>
      </View>

      {lastScanResult && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Last Result</Text>
            <Text style={styles.resultSubtitle}>
              {lastScanResult?.success ? '✅ Success' : '❌ Failed'}
            </Text>
          </View>
          
          <View style={styles.resultDetails}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Action:</Text>
              <Text style={styles.resultValue}>
                {lastScanResult.action.charAt(0).toUpperCase() + lastScanResult.action.slice(1)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Student:</Text>
              <Text style={styles.resultValue}>{lastScanResult.studentName}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Time:</Text>
              <Text style={styles.resultValue}>{lastScanResult.time}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <Text style={styles.resetButtonText}>Record Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  inputContainer: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginVertical: 4,
  },
  resultContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  resultSubtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  resultDetails: {
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  resultValue: {
    fontSize: 16,
    color: '#1e293b',
  },
  resetButton: {
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
