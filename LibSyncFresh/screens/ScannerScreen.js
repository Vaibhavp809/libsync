import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert, TextInput, TouchableOpacity, Modal, StatusBar, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, Camera } from 'expo-camera';
import { apiService } from '../services/apiService';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function ScannerScreen() {
  const [accessionNumber, setAccessionNumber] = useState('');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [studentId, setStudentId] = useState('');

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleCameraScan = ({ type, data }) => {
    setScanned(true);
    
    // Validate scanned data is within accession number range (000000-026542)
    const scannedNumber = parseInt(data);
    if (isNaN(scannedNumber) || scannedNumber < 0 || scannedNumber > 26542) {
      Alert.alert(
        "Invalid Accession Number", 
        `Scanned code "${data}" is not a valid accession number. Expected range: 000000-026542`
      );
      setShowCamera(false);
      return;
    }
    
    // Pad to 6 digits
    const paddedAccession = data.toString().padStart(6, '0');
    setAccessionNumber(paddedAccession);
    setShowCamera(false);
    
    // Auto-search the scanned accession number
    searchByAccessionNumber(paddedAccession);
  };

  const openCamera = async () => {
    if (hasPermission === null) {
      await getCameraPermissions();
    }
    
    if (hasPermission === false) {
      Alert.alert(
        'Camera Permission Needed',
        'Please allow camera access to scan barcodes.',
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

  const searchByAccessionNumber = async (accessionCode) => {
    if (!accessionCode.trim()) {
      Alert.alert("Error", "Please enter an accession number");
      return;
    }
    
    // Validate accession number range
    const accessionNum = parseInt(accessionCode);
    if (isNaN(accessionNum) || accessionNum < 0 || accessionNum > 26542) {
      Alert.alert("Invalid Range", "Accession number must be between 000000 and 026542");
      return;
    }
    
    setLoading(true);
    try {
      // Search for book by accession number using search API
      const paddedAccession = accessionCode.toString().padStart(6, '0');
      const response = await apiService.searchBooks(paddedAccession);
      
      // Find exact match for the accession number
      let foundBook = null;
      if (Array.isArray(response)) {
        foundBook = response.find(book => 
          book && book.accessionNumber && 
          book.accessionNumber.toString().padStart(6, '0') === paddedAccession
        );
      }
      
      if (foundBook) {
        setBook(foundBook);
      } else {
        Alert.alert(
          "Book Not Found", 
          `No book found with accession number: ${paddedAccession}`
        );
        setBook(null);
      }
    } catch (error) {
      Alert.alert(
        "Search Error", 
        error.message || "Failed to search for book. Please try again."
      );
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    searchByAccessionNumber(accessionNumber);
  };
  
  // Load student ID on component mount
  React.useEffect(() => {
    const loadStudentData = async () => {
      try {
        let userData = await AsyncStorage.getItem('user_data');
        if (!userData) {
          userData = await AsyncStorage.getItem('userData');
        }
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setStudentId(parsedUser._id || parsedUser.id);
        }
      } catch (error) {
        console.error('Failed to load student data:', error);
      }
    };
    loadStudentData();
  }, []);
  
  const reserveBook = async (bookId) => {
    if (!studentId) {
      Alert.alert("Error", "Unable to get student information. Please try logging in again.");
      return;
    }
    
    setReserving(true);
    try {
      await apiService.createReservation(studentId, bookId);
      Alert.alert(
        "Success!", 
        "Book reserved successfully. You can view your reservations in the My Reservations section.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Reservation Failed", error.message);
    } finally {
      setReserving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Book Scanner</Text>
        <Text style={styles.headerSubtitle}>Find books instantly with barcode scanning</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <View style={styles.scanSection}>
            <View style={styles.scanIconContainer}>
              <Text style={styles.scanIcon}>📱</Text>
            </View>
            <Text style={styles.scanTitle}>Quick Barcode Scan</Text>
            <Text style={styles.scanDescription}>Point your camera at any book barcode for instant results</Text>
            
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <Text style={styles.cameraButtonText}>📷 Start Scanning</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.manualSection}>
            <Text style={styles.manualTitle}>Manual Accession Number Entry</Text>
            <Text style={styles.manualDescription}>Enter the 6-digit accession number manually</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter Accession Number (e.g., 000123)"
              placeholderTextColor={colors.textTertiary}
              value={accessionNumber}
              onChangeText={setAccessionNumber}
              keyboardType="numeric"
            />
            
            <TouchableOpacity 
              style={[styles.searchButton, loading && styles.searchButtonDisabled]}
              onPress={handleManualSearch}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.searchButtonText}>
                {loading ? "🔍 Searching..." : "🔍 Search Book"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {book && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>📖 Book Found!</Text>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => { setBook(null); setAccessionNumber(''); }}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bookCard}>
              <View style={styles.bookIconContainer}>
                <Text style={styles.bookEmoji}>📚</Text>
              </View>
              
              <View style={styles.bookDetails}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>by {book.author}</Text>
                <Text style={styles.bookCategory}>{book.category}</Text>
                
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { 
                    backgroundColor: book.status === 'Available' ? colors.success : colors.warning 
                  }]} />
                  <Text style={styles.statusText}>{book.status}</Text>
                </View>
                
                {book.status === 'Available' && (
                  <TouchableOpacity 
                    style={[styles.reserveButton, reserving && styles.reserveButtonDisabled]}
                    onPress={() => reserveBook(book._id)}
                    disabled={reserving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reserveButtonText}>
                      {reserving ? "📋 Reserving..." : "📋 Reserve Book"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.newSearchButton}
              onPress={() => { setBook(null); setAccessionNumber(''); }}
              activeOpacity={0.8}
            >
              <Text style={styles.newSearchButtonText}>🔍 Search Another Book</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      <Modal
        animationType="slide"
        transparent={false}
        visible={showCamera}
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scan Book Barcode</Text>
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
                  barcodeTypes: ['qr', 'pdf417', 'ean13', 'ean8', 'code39', 'code93', 'code128', 'upc_a', 'upc_e'],
                }}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanArea}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanInstruction}>
                    Point your camera at a book barcode
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
    ...layout.container,
  },
  
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  headerTitle: {
    ...typography.displayMedium,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  headerSubtitle: {
    ...typography.bodyLarge,
    color: colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  content: {
    flex: 1,
    padding: spacing.md,
  },
  
  searchContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    ...shadows.medium,
  },
  
  scanSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  scanIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  
  scanIcon: {
    fontSize: 36,
  },
  
  scanTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  scanDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  
  cameraButton: {
    ...components.buttonPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 200,
  },
  
  cameraButtonText: {
    ...typography.buttonLarge,
    color: colors.textInverse,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  
  dividerText: {
    ...typography.labelMedium,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },
  
  manualSection: {
    alignItems: 'center',
  },
  
  manualTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  manualDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  input: {
    ...components.input,
    width: '100%',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  searchButton: {
    ...components.buttonSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
  },
  
  searchButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  
  searchButtonText: {
    ...typography.buttonLarge,
    color: colors.textInverse,
  },
  
  resultContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.large,
  },
  
  resultHeader: {
    ...layout.spaceBetween,
    marginBottom: spacing.lg,
  },
  
  resultTitle: {
    ...typography.heading1,
    color: colors.success,
  },
  
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  clearButtonText: {
    ...typography.heading3,
    color: colors.textSecondary,
  },
  
  bookCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  
  bookIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  bookEmoji: {
    fontSize: 28,
  },
  
  bookDetails: {
    flex: 1,
  },
  
  bookTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  bookAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  bookCategory: {
    ...typography.labelMedium,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  
  statusContainer: {
    ...layout.row,
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
    marginTop: spacing.xs,
  },
  
  statusText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  
  newSearchButton: {
    ...components.buttonOutline,
    paddingVertical: spacing.md,
  },
  
  newSearchButtonText: {
    ...typography.buttonMedium,
    color: colors.primary,
  },
  
  reserveButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.small,
  },
  
  reserveButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  
  reserveButtonText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
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
    height: 150,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
    marginBottom: 50,
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  rescanButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
