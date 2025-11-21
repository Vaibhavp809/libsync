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
  const [initError, setInitError] = React.useState(null);

  useEffect(() => {
    // Wrap everything in try-catch to prevent crashes
    try {
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
    } catch (error) {
      console.error('❌ Failed to configure notification handler:', error);
      // Continue without notification handler
    }

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
        
        // Initialize Notification service (for handling received notifications and push token registration)
        // This should always be initialized to set up notification handlers
        // Wrap in setTimeout to ensure it doesn't block app startup
        setTimeout(async () => {
          try {
            // Always initialize notification service to set up handlers
            // The service will handle device checks internally
            await notificationService.initialize();
            console.log('✅ Notification service initialized');
          } catch (notificationError) {
            console.error('❌ Notification service initialization failed:', notificationError);
            console.error('Error details:', notificationError.message, notificationError.stack);
            console.log('Continuing without push notifications...');
            // Don't try fallback - just continue without notifications
          }
        }, 1000); // Delay by 1 second to let app render first
      } catch (error) {
        console.error('Service initialization failed:', error);
        // Don't crash the app - continue with default configuration
      }
    };
    
    // Initialize services asynchronously without blocking app render
    initializeServices()
      .then(() => {
        console.log('✅ All services initialized successfully');
        setIsReady(true);
      })
      .catch(err => {
        console.error('❌ Fatal initialization error:', err);
        console.error('Error stack:', err.stack);
        setInitError(err.message || 'Initialization failed');
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
          {initError && (
            <Text style={{ fontSize: 12, color: '#ff0000', marginTop: 10, padding: 10 }}>
              Warning: {initError}
            </Text>
          )}
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

  // Wrap everything in try-catch for safety
  try {
    return (
      <ErrorBoundary>
        <NavigationContainer
          onReady={() => console.log('✅ NavigationContainer ready')}
          onStateChange={() => console.log('Navigation state changed')}
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
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ Fatal error in App render:', error);
    return (
      <ErrorBoundary>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ fontSize: 18, color: '#ff0000', marginBottom: 10 }}>App Error</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {error.message || 'An unexpected error occurred'}
          </Text>
        </View>
      </ErrorBoundary>
    );
  }
}

export default App;
