import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as Notifications from 'expo-notifications';
import { apiConfig } from './config/apiConfig';
import { authService } from './services/authService';
import { apiService } from './services/apiService';
import { notificationService, registerForPushNotificationsAsync } from './services/notificationService';
import CustomHeader from './components/CustomHeader';
import CustomDrawerContent from './components/CustomDrawerContent';
import ErrorBoundary from './components/ErrorBoundary';
import MyReservationsScreen from './screens/MyReservationsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import BookListScreen from './screens/BookListScreen';
import ScannerScreen from './screens/ScannerScreen';
import AttendanceScannerScreen from './screens/AttendanceScannerScreen';
import LoanHistoryScreen from './screens/LoanHistoryScreen';
import NewArrivalsScreen from './screens/NewArrivalsScreen';
import SettingsScreen from './screens/SettingsScreen';
import DebugScreen from './screens/DebugScreen';
import EResourcesScreen from './screens/EResourcesScreen';
import LibraryUpdatesScreen from './screens/LibraryUpdatesScreen';
import NotificationsScreen from './screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function App() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    // Configure notification handler FIRST - this must be done before any notifications arrive
    // This ensures notifications are displayed even when app is in background or closed
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Always show notifications, even when app is in foreground, background, or closed
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // For Android: ensure notification appears in system tray and lock screen
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      },
    });
    console.log('✅ Notification handler configured for background/foreground display');

    // Initialize API and Auth services (non-blocking)
    const initializeServices = async () => {
      try {
        // Initialize Auth service (load saved token and user)
        try {
          await authService.initialize();
        } catch (authError) {
          console.warn('Auth service initialization failed:', authError.message);
          // Continue without auth - user can login later
        }
        
        // Initialize API service
        try {
          await apiService.initialize();
        } catch (apiError) {
          console.warn('API service initialization failed:', apiError.message);
          // Continue - will use default production URL
        }
        
        // Configure API to use the correct server (defaults to production URL)
        try {
          await apiConfig.getCurrentServerIP();
        } catch (configError) {
          console.warn('API config initialization failed:', configError.message);
          // Continue with default production URL
        }
        
        // Register for push notifications (non-blocking)
        // This will work in EAS dev-client builds, not in Expo Go
        registerForPushNotificationsAsync()
          .then(async (token) => {
            if (token) {
              console.log('✅ Expo push token registered:', token);
              // Save token to storage
              try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem('expo_push_token', token);
                console.log('✅ Push token saved to storage');
                
                // Try to send token to server if user is already logged in
                try {
                  const { notificationService } = require('./services/notificationService');
                  await notificationService.sendPushTokenToServer(token);
                  console.log('✅ Push token sent to server');
                } catch (pushError) {
                  console.log('ℹ️ Could not send push token to server (user may not be logged in yet):', pushError.message);
                  // Token will be sent after login via authService
                }
              } catch (storageError) {
                console.warn('⚠️ Failed to save push token:', storageError.message);
              }
            } else {
              console.log('ℹ️ Push notification registration skipped or failed');
            }
          })
          .catch(err => {
            console.warn('⚠️ Notification registration failed:', err);
            // App continues normally even if notifications fail
          });
        
        // Initialize Notification service (for handling received notifications)
        try {
          // Check if we're running in Expo Go or a development build
          const { isDevice } = require('expo-device');
          const Constants = require('expo-constants');
          
          // Only initialize notification handlers if NOT in Expo Go
          if (isDevice && Constants.appOwnership !== 'expo') {
            await notificationService.initialize();
          } else {
            console.log('Notification handlers disabled in Expo Go - use development build for push notifications');
          }
        } catch (notificationError) {
          console.log('Notification service initialization failed:', notificationError.message);
          console.log('Continuing without push notifications...');
        }
      } catch (error) {
        console.error('Service initialization failed:', error);
        // Don't crash the app - continue with default configuration
      }
    };
    
    // Initialize services asynchronously without blocking app render
    initializeServices()
      .then(() => {
        setIsReady(true);
      })
      .catch(err => {
        console.error('Fatal initialization error:', err);
        // App will still render even if initialization fails
        setIsReady(true);
      });
  }, []);

  // Show loading screen while initializing
  if (!isReady) {
    return (
      <ErrorBoundary>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, color: '#333' }}>Loading LibSync...</Text>
        </View>
      </ErrorBoundary>
    );
  }

  // Create a drawer navigator for authenticated screens
  const DrawerNavigator = () => {
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
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Books" component={BookListScreen} />
        <Drawer.Screen name="MyReservations" component={MyReservationsScreen} />
        <Drawer.Screen name="LoanHistory" component={LoanHistoryScreen} />
        <Drawer.Screen name="AttendanceScanner" component={AttendanceScannerScreen} />
        <Drawer.Screen name="LibraryUpdates" component={LibraryUpdatesScreen} />
        <Drawer.Screen name="EResources" component={EResourcesScreen} />
        <Drawer.Screen name="Notifications" component={NotificationsScreen} />
        <Drawer.Screen name="Scanner" component={ScannerScreen} />
        <Drawer.Screen name="NewArrivals" component={NewArrivalsScreen} />
        <Drawer.Screen name="Settings" component={SettingsScreen} />
        <Drawer.Screen name="Debug" component={DebugScreen} />
      </Drawer.Navigator>
    );
  };

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

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={DrawerNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default App;
