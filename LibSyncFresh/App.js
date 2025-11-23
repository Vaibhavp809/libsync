import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Try to import expo-splash-screen (may not be available in all Expo versions)
let SplashScreen;
try {
  SplashScreen = require('expo-splash-screen');
} catch (e) {
  console.log('expo-splash-screen not available, using fallback');
  SplashScreen = {
    preventAutoHideAsync: async () => {},
    hideAsync: async () => {},
  };
}

// Minimal styles for error screens (defined early)
const errorStyle = { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' };

// Lazy load screens to prevent import errors from crashing the app
let LoginScreen, RegisterScreen, HomeScreen, BookListScreen, ScannerScreen;
let AttendanceScannerScreen, LoanHistoryScreen, NewArrivalsScreen;
let SettingsScreen, DebugScreen, EResourcesScreen, LibraryUpdatesScreen;
let NotificationsScreen, CustomHeader, CustomDrawerContent, ErrorBoundary;

try {
  LoginScreen = require('./src/screens/LoginScreen').default;
} catch (e) {
  console.error('Failed to load LoginScreen:', e);
  LoginScreen = () => <View style={errorStyle}><Text>Login Screen Error</Text></View>;
}

try {
  RegisterScreen = require('./src/screens/RegisterScreen').default;
} catch (e) {
  console.error('Failed to load RegisterScreen:', e);
  RegisterScreen = () => <View style={errorStyle}><Text>Register Screen Error</Text></View>;
}

try {
  HomeScreen = require('./screens/HomeScreen').default;
  BookListScreen = require('./screens/BookListScreen').default;
  ScannerScreen = require('./screens/ScannerScreen').default;
  AttendanceScannerScreen = require('./screens/AttendanceScannerScreen').default;
  LoanHistoryScreen = require('./screens/LoanHistoryScreen').default;
  NewArrivalsScreen = require('./screens/NewArrivalsScreen').default;
  SettingsScreen = require('./screens/SettingsScreen').default;
  DebugScreen = require('./screens/DebugScreen').default;
  EResourcesScreen = require('./screens/EResourcesScreen').default;
  LibraryUpdatesScreen = require('./screens/LibraryUpdatesScreen').default;
  NotificationsScreen = require('./screens/NotificationsScreen').default;
  CustomHeader = require('./components/CustomHeader').default;
  CustomDrawerContent = require('./components/CustomDrawerContent').default;
  ErrorBoundary = require('./components/ErrorBoundary').default;
} catch (e) {
  console.error('Failed to load screens:', e);
}

// Load MyReservationsScreen separately
let MyReservationsScreen;
try {
  MyReservationsScreen = require('./screens/MyReservationsScreen').default;
} catch (e) {
  console.error('Failed to load MyReservationsScreen:', e);
  MyReservationsScreen = () => <View style={errorStyle}><Text>MyReservations Screen Error</Text></View>;
}

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('📱 App useEffect started');
    
    // Initialize services asynchronously - don't block render
    const initializeServices = async () => {
      try {
        console.log('📱 Starting service initialization...');
        
        // Initialize API config (non-blocking)
        try {
          const { apiConfig } = require('./config/apiConfig');
          await apiConfig.getBaseURL();
          console.log('✅ API config initialized');
        } catch (error) {
          console.warn('⚠️ API config init failed:', error.message);
        }

        // Initialize Auth service and check authentication state
        let authState = false;
        try {
          const { authService } = require('./services/authService');
          const authData = await authService.initialize();
          if (authData && authData.token && authData.user) {
            authState = true;
            console.log('✅ Auth service initialized - user is logged in');
          } else {
            console.log('✅ Auth service initialized - user is not logged in');
          }
        } catch (error) {
          console.warn('⚠️ Auth service init failed:', error.message);
        }
        setIsAuthenticated(authState);

        // Initialize API service (non-blocking)
        try {
          const { apiService } = require('./services/apiService');
          await apiService.initialize();
          console.log('✅ API service initialized');
        } catch (error) {
          console.warn('⚠️ API service init failed:', error.message);
        }

        // Configure notifications AFTER app is ready (delayed)
        // Only configure handlers, don't request permissions yet - wait until after login
        setTimeout(async () => {
          try {
            const { notificationService } = require('./services/notificationService');
            // Always configure notification handler first (this doesn't request permissions)
            notificationService.configure();
            console.log('✅ Notification handler configured');
            
            // Set up listeners for receiving notifications (but don't request permissions yet)
            // This allows the app to receive notifications without requesting permissions before login
            notificationService.setupNotificationListeners();
            console.log('✅ Notification listeners set up');
            
            // DO NOT call initialize() here - it requests permissions
            // Instead, permissions will be requested after successful login
            console.log('ℹ️ Push token registration will happen after user logs in');
          } catch (error) {
            console.error('❌ Notification service setup failed:', error);
            console.log('Continuing without push notifications...');
          }
        }, 2000);

        console.log('✅ All services initialized');
        setIsReady(true);
        
        // Hide splash screen after initialization
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Splash screen hidden');
        } catch (splashError) {
          console.warn('⚠️ Could not hide splash screen:', splashError.message);
        }
      } catch (error) {
        console.error('❌ Service initialization error:', error);
        setInitError(error.message);
        setIsReady(true); // Still show app even if init fails
        
        // Try to hide splash screen even on error
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          // Ignore splash screen errors
        }
      }
    };

    // Keep splash screen visible during initialization
    SplashScreen.preventAutoHideAsync().catch(() => {
      // Ignore if already hidden or not available
    });

    initializeServices();
  }, []);

  // Show loading screen
  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading LibSync...</Text>
        {initError && (
          <Text style={styles.errorText}>Warning: {initError}</Text>
        )}
      </View>
    );
  }

  // Helper function to get screen titles
  const getScreenTitle = (routeName) => {
    const titles = {
      Home: 'LibSync',
      Books: 'Search Books',
      MyReservations: 'My Reservations',
      LoanHistory: 'Loan History',
      AttendanceScanner: 'Attendance',
      LibraryUpdates: 'Library Updates',
      EResources: 'E-Resources',
      Notifications: 'Notifications',
      Scanner: 'Barcode Scanner',
      NewArrivals: 'New Arrivals',
      Settings: 'Settings',
      Debug: 'Debug Info',
    };
    return titles[routeName] || 'LibSync';
  };

  // Create drawer navigator
  const DrawerNavigator = () => {
    if (!CustomDrawerContent || !CustomHeader) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>Navigation components not loaded</Text>
        </View>
      );
    }

    return (
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation, route }) => ({
          header: () => (
            <CustomHeader 
              navigation={navigation} 
              title={getScreenTitle(route.name)}
              showNotificationBell={route.name !== 'Notifications'}
            />
          ),
          drawerPosition: 'left',
          drawerType: 'slide',
          overlayColor: 'rgba(0,0,0,0.5)',
          drawerStyle: {
            width: 280,
          },
        })}
      >
        {HomeScreen && <Drawer.Screen name="Home" component={HomeScreen} />}
        {BookListScreen && <Drawer.Screen name="Books" component={BookListScreen} />}
        {MyReservationsScreen && <Drawer.Screen name="MyReservations" component={MyReservationsScreen} />}
        {ScannerScreen && <Drawer.Screen name="Scanner" component={ScannerScreen} />}
        {AttendanceScannerScreen && <Drawer.Screen name="AttendanceScanner" component={AttendanceScannerScreen} />}
        {LoanHistoryScreen && <Drawer.Screen name="LoanHistory" component={LoanHistoryScreen} />}
        {NewArrivalsScreen && <Drawer.Screen name="NewArrivals" component={NewArrivalsScreen} />}
        {LibraryUpdatesScreen && <Drawer.Screen name="LibraryUpdates" component={LibraryUpdatesScreen} />}
        {EResourcesScreen && <Drawer.Screen name="EResources" component={EResourcesScreen} />}
        {NotificationsScreen && <Drawer.Screen name="Notifications" component={NotificationsScreen} />}
        {SettingsScreen && <Drawer.Screen name="Settings" component={SettingsScreen} />}
        {DebugScreen && <Drawer.Screen name="Debug" component={DebugScreen} />}
      </Drawer.Navigator>
    );
  };

  // Main app render
  try {
    return (
      <NavigationContainer
        onReady={() => console.log('✅ NavigationContainer ready')}
      >
        <Stack.Navigator 
          initialRouteName={isAuthenticated ? "Main" : "Login"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={DrawerNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (error) {
    console.error('❌ Fatal error in App render:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>App Error</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    marginTop: 10,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;
