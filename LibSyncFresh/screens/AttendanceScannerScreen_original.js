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
  StatusBar
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/apiConfig';

export default function AttendanceScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
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

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanning) return; // Prevent multiple scans
    
    setScanning(true);
    setScanned(true);
    
    try {
      // Check if user is logged in
      if (!userInfo || !userInfo._id) {
        Alert.alert(
          "Login Required", 
          "Please log in to record attendance.",
          [{ text: "OK" }]
        );
        setScanning(false);
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
          token: data,
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
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setLastScanResult(null);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>❌ No access to camera</Text>
          <Text style={styles.errorSubtext}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => BarCodeScanner.requestPermissionsAsync()}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!scanned ? (
        <View style={styles.scannerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📱 Attendance Scanner</Text>
            <Text style={styles.headerSubtitle}>
              Scan the daily QR code to record your attendance
            </Text>
          </View>
          
          <View style={styles.scannerFrame}>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          </View>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              📍 Point your camera at the QR code displayed in the library
            </Text>
            <Text style={styles.instructionText}>
              🔄 First scan = Login, Second scan = Logout
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Scan Result</Text>
            <Text style={styles.resultSubtitle}>
              {lastScanResult?.success ? '✅ Success' : '❌ Failed'}
            </Text>
          </View>
          
          {lastScanResult && (
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
              
              {!lastScanResult.success && lastScanResult.error && (
                <View style={styles.errorRow}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorValue}>{lastScanResult.error}</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.resultActions}>
            <TouchableOpacity 
              style={styles.scanAgainButton}
              onPress={resetScanner}
            >
              <Text style={styles.scanAgainButtonText}>🔄 Scan Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center'
  },
  errorText: {
    fontSize: 20,
    color: '#ef4444',
    marginBottom: 8,
    textAlign: 'center'
  },
  errorSubtext: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center'
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  scannerContainer: {
    flex: 1,
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22
  },
  scannerFrame: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3b82f6'
  },
  cornerTopRight: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3b82f6'
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3b82f6'
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3b82f6'
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 20
  },
  instructionText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20
  },
  resultContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white'
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  resultSubtitle: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500'
  },
  resultDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  resultLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500'
  },
  resultValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600'
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  errorLabel: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500'
  },
  errorValue: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16
  },
  resultActions: {
    gap: 16
  },
  scanAgainButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  scanAgainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  backButtonText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '600'
  }
});
