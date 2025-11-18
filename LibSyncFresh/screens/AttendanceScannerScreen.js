import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, Camera } from 'expo-camera';
import { apiConfig } from '../config/apiConfig';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';

export default function AttendanceScannerScreen({ navigation }) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    (async () => {
      // Initialize auth service and get user info
      try {
        await authService.initialize();
        const user = authService.getUser();
        if (user) {
          setUserInfo(user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    })();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleCameraScan = ({ type, data }) => {
    setScanned(true);
    setQrCode(data);
    setShowCamera(false);
    // Auto-process the scanned code
    processScannedCode(data);
  };

  const processScannedCode = async (data) => {
    setLoading(true);
    
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        Alert.alert(
          "Login Required", 
          "Please log in to record attendance.",
          [{ text: "OK" }]
        );
        return;
      }

      // Send scan data to backend using dataService
      console.log('Attempting to mark attendance with data:', {
        token: data,
        studentId: userInfo?._id || userInfo?.id
      });
      
      const result = await dataService.markAttendance({
        token: data,
        studentId: userInfo?._id || userInfo?.id
      });
      
      console.log('Attendance result:', result);

      if (result.success) {
        const scanData = result.data;
        setLastScanResult({
          action: scanData.action,
          studentName: scanData.studentName,
          time: new Date(scanData.time).toLocaleTimeString(),
          success: true
        });
        
        Alert.alert(
          "Attendance Recorded!", 
          `Successfully recorded ${scanData.action} for ${scanData.studentName}`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(result.message || 'Attendance recording failed');
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

  const openCamera = async () => {
    if (hasPermission === null) {
      await getCameraPermissions();
    }
    
    if (hasPermission === false) {
      Alert.alert(
        'Camera Permission Needed',
        'Please allow camera access to scan QR codes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => getCameraPermissions() }
        ]
      );
      return;
    }
    
    setScanned(false);
    setShowCamera(true);
  };

  const handleManualScan = async () => {
    if (!qrCode.trim()) {
      Alert.alert("Error", "Please enter the QR code data");
      return;
    }

    setLoading(true);
    
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        Alert.alert(
          "Login Required", 
          "Please log in to record attendance.",
          [{ text: "OK" }]
        );
        return;
      }

      // Send scan data to backend using dataService
      const result = await dataService.markAttendance({
        token: qrCode.trim(),
        studentId: userInfo?._id || userInfo?.id
      });

      if (result.success) {
        const scanData = result.data;
        setLastScanResult({
          action: scanData.action,
          studentName: scanData.studentName,
          time: new Date(scanData.time).toLocaleTimeString(),
          success: true
        });
        
        Alert.alert(
          "Attendance Recorded!", 
          `Successfully recorded ${scanData.action} for ${scanData.studentName}`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(result.message || 'Attendance recording failed');
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
      <StatusBar barStyle="light-content" backgroundColor={colors.success} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Attendance Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Record your library visits with QR code scanning
        </Text>
      </View>
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.scannerCard}>
            <View style={styles.scanSection}>
              <View style={styles.scanIconContainer}>
                <Text style={styles.scanIcon}>📱</Text>
              </View>
              <Text style={styles.scanTitle}>Quick QR Scan</Text>
              <Text style={styles.scanDescription}>Scan the library's QR code to record your attendance instantly</Text>
              
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={openCamera}
                activeOpacity={0.8}
              >
                <Text style={styles.cameraButtonText}>📷 Start QR Scan</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.manualSection}>
              <Text style={styles.manualTitle}>Manual Entry</Text>
              <Text style={styles.manualDescription}>Enter the QR code data manually if scanning isn't available</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Paste QR code data here..."
                placeholderTextColor={colors.textSecondary}
                value={qrCode}
                onChangeText={setQrCode}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleManualScan}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "⏳ Processing..." : "✔️ Record Attendance"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📝 How it Works</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionIcon}>📍</Text>
              <Text style={styles.instructionText}>Ask the librarian for the current QR code</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionIcon}>🔄</Text>
              <Text style={styles.instructionText}>First scan logs you in, second scan logs you out</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionIcon}>⏰</Text>
              <Text style={styles.instructionText}>Your visit duration will be automatically tracked</Text>
            </View>
          </View>

          {lastScanResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>
                  {lastScanResult?.success ? '✅ Attendance Recorded!' : '❌ Scan Failed'}
                </Text>
              </View>
              
              <View style={[styles.resultContent, {
                backgroundColor: lastScanResult?.success ? colors.success + '10' : colors.error + '10',
                borderLeftColor: lastScanResult?.success ? colors.success : colors.error
              }]}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>🎦 Action:</Text>
                  <Text style={[styles.resultValue, {
                    color: lastScanResult?.success ? colors.success : colors.error
                  }]}>
                    {lastScanResult.action.charAt(0).toUpperCase() + lastScanResult.action.slice(1)}
                  </Text>
                </View>
                
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>👤 Student:</Text>
                  <Text style={styles.resultValue}>{lastScanResult.studentName}</Text>
                </View>
                
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>⏰ Time:</Text>
                  <Text style={styles.resultValue}>{lastScanResult.time}</Text>
                </View>
                
                {lastScanResult.error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{lastScanResult.error}</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.newScanButton} 
                onPress={resetScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.newScanButtonText}>🔄 Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      <Modal
        animationType="slide"
        transparent={false}
        visible={showCamera}
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scan QR Code</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {hasPermission === null ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>Requesting camera permission...</Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>No access to camera</Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={getCameraPermissions}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleCameraScan}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'code39', 'code93', 'code128', 'upc_a', 'upc_e'],
                }}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanArea}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanInstruction}>
                    Point your camera at a QR code
                  </Text>
                  {scanned && (
                    <TouchableOpacity
                      style={styles.rescanButton}
                      onPress={() => setScanned(false)}
                    >
                      <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    backgroundColor: colors.success,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  scrollContent: {
    flex: 1,
  },
  
  content: {
    padding: spacing.md,
  },
  
  scannerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  
  scanSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  scanIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  
  scanIcon: {
    fontSize: 36,
  },
  
  scanTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  scanDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  
  cameraButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    ...shadows.medium,
  },
  
  cameraButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textLight,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  
  manualSection: {
    alignItems: 'center',
  },
  
  manualTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  manualDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    ...shadows.medium,
  },
  
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textLight,
  },
  
  instructionsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  instructionIcon: {
    fontSize: 16,
    marginRight: spacing.md,
    marginTop: 2,
  },
  
  instructionText: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  
  resultCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  
  resultHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  
  resultContent: {
    borderLeftWidth: 4,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  resultLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
  },
  
  resultValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  
  errorContainer: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  
  newScanButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  newScanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  // Camera Modal Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  
  cameraTitle: {
    color: colors.textLight,
    fontSize: 20,
    fontWeight: '600',
  },
  
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  closeButtonText: {
    color: colors.textLight,
    fontSize: 20,
    fontWeight: '600',
  },
  
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  
  camera: {
    flex: 1,
  },
  
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.success,
    borderRadius: borderRadius.xl,
    backgroundColor: 'transparent',
    marginBottom: 50,
  },
  
  scanInstruction: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  
  rescanButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  
  rescanButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  permissionText: {
    color: colors.textLight,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  
  permissionButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
