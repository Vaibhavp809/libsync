import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

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

        // Initialize Auth service (non-blocking)
        try {
          const { authService } = require('./services/authService');
          await authService.initialize();
          console.log('✅ Auth service initialized');
        } catch (error) {
          console.warn('⚠️ Auth service init failed:', error.message);
        }

        // Initialize API service (non-blocking)
        try {
          const { apiService } = require('./services/apiService');
          await apiService.initialize();
          console.log('✅ API service initialized');
        } catch (error) {
          console.warn('⚠️ API service init failed:', error.message);
        }

        // Configure notifications AFTER app is ready (delayed)
        setTimeout(async () => {
          try {
            const Notifications = require('expo-notifications');
            Notifications.setNotificationHandler({
              handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
              }),
            });
            console.log('✅ Notification handler configured');
          } catch (error) {
            console.warn('⚠️ Notification setup failed:', error.message);
          }
        }, 2000);

        console.log('✅ All services initialized');
        setIsReady(true);
      } catch (error) {
        console.error('❌ Service initialization error:', error);
        setInitError(error.message);
        setIsReady(true); // Still show app even if init fails
      }
    };

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
        {NotificationsScreen && <Drawer.Screen name="Notifications" component={NotificationsScreen} />}
        {SettingsScreen && <Drawer.Screen name="Settings" component={SettingsScreen} />}
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
          initialRouteName="Login"
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
