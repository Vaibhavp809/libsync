import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { apiConfig } from './config/apiConfig';
import { authService } from './services/authService';
import { apiService } from './services/apiService';
import { notificationService, registerForPushNotificationsAsync } from './services/notificationService';
import CustomHeader from './components/CustomHeader';
import CustomDrawerContent from './components/CustomDrawerContent';
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

export default function App() {
  useEffect(() => {
    // Initialize API and Auth services
    const initializeServices = async () => {
      try {
        // Initialize Auth service (load saved token and user)
        const authData = await authService.initialize();
        
        // Initialize API service
        await apiService.initialize();
        
        // Register for push notifications (non-blocking)
        // This will work in EAS dev-client builds, not in Expo Go
        registerForPushNotificationsAsync()
          .then(token => {
            if (token) {
              console.log('✅ Expo push token registered:', token);
              // Token can be sent to your backend here if needed
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
        
        // Configure API to use the correct server
        const currentIP = await apiConfig.getCurrentServerIP();
        if (!currentIP) {
          await apiConfig.setServerIP('172.22.132.218');
        }
      } catch (error) {
        console.error('Service initialization failed:', error);
      }
    };
    
    initializeServices();
  }, []);

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
  );
}
