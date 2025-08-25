import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyReservationsScreen from './screens/MyReservationsScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import BookListScreen from './screens/BookListScreen'; // ✅ Added
import ScannerScreen from './screens/ScannerScreen';
import AttendanceScannerScreen from './screens/AttendanceScannerScreen';
import LoanHistoryScreen from './screens/LoanHistoryScreen';
import NewArrivalsScreen from './screens/NewArrivalsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
