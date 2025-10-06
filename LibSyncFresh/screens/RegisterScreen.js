import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { apiConfig } from '../config/apiConfig';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [studentID, setStudentID] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validate inputs
    if (!name.trim() || !email.trim() || !password.trim() || !studentID.trim() || !department.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const endpoint = await apiConfig.getEndpoint('/auth/register');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'student',
          studentID: studentID.trim(),
          department: department.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      Alert.alert('Success', 'Registered successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert(
        'Registration Failed',
        err.message || 'Unable to connect to server. Please check your connection or go to Settings.',
        [
          { text: 'OK' },
          { text: 'Settings', onPress: () => navigation.navigate('Settings') }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register to LibSync</Text>
      <TextInput style={styles.input} placeholder="Name" onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Student ID" onChangeText={setStudentID} />
      <TextInput style={styles.input} placeholder="Department" onChangeText={setDepartment} />
      <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" onChangeText={setPassword} secureTextEntry />
      <Button 
        title={loading ? "Registering..." : "Register"} 
        onPress={handleRegister} 
        disabled={loading}
      />
      {loading && <ActivityIndicator style={styles.loader} />}
      <Text onPress={() => navigation.navigate('Login')} style={styles.link}>
        Already registered? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { height: 40, borderBottomWidth: 1, marginBottom: 15 },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  link: { marginTop: 20, textAlign: 'center', color: 'blue' },
  loader: { marginTop: 10 },
});
