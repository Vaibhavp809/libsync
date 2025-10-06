import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { apiConfig } from './config/apiConfig';
import { authService } from './services/authService';
import { apiService } from './services/apiService';
import MyReservationsScreen from './screens/MyReservationsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import BookListScreen from './screens/BookListScreen'; // ✅ Added
import ScannerScreen from './screens/ScannerScreen';
import AttendanceScannerScreen from './screens/AttendanceScannerScreen';
import LoanHistoryScreen from './screens/LoanHistoryScreen';
import NewArrivalsScreen from './screens/NewArrivalsScreen';
import SettingsScreen from './screens/SettingsScreen';
import DebugScreen from './screens/DebugScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize API and Auth services
    const initializeServices = async () => {
      try {
        // Initialize Auth service (load saved token and user)
        const authData = await authService.initialize();
        
        // Initialize API service
        await apiService.initialize();
        
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

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Books" component={BookListScreen} /> 
        <Stack.Screen name="MyReservations" component={MyReservationsScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="AttendanceScanner" component={AttendanceScannerScreen} />
        <Stack.Screen name="LoanHistory" component={LoanHistoryScreen} />
        <Stack.Screen name="NewArrivals" component={NewArrivalsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Debug" component={DebugScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
