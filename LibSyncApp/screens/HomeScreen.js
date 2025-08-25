import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        setUser(JSON.parse(data));
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to LibSync 📚</Text>
      {user && (
        <Text style={{ marginBottom: 20 }}>
          Hello, {user.name} ({user.studentID}) - {user.department}
        </Text>
      )}
      <Button title="Search Books" onPress={() => navigation.navigate("Books")} />
      <Button title="My Reservations" onPress={() => navigation.navigate("MyReservations")} />
      <Button title="Scan Book ISBN" onPress={() => navigation.navigate("Scanner")} />
      <Button title="📱 Attendance Scanner" onPress={() => navigation.navigate("AttendanceScanner")} />
      <Button title="Loan History" onPress={() => navigation.navigate("LoanHistory")} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 30, textAlign: 'center' }
});
