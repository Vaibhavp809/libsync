import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, ActivityIndicator, Picker } from 'react-native';
import { apiConfig } from '../config/apiConfig';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [studentID, setStudentID] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const endpoint = await apiConfig.getEndpoint('/departments');
        const response = await fetch(endpoint);
        const data = await response.json();
        if (data.success && data.departments) {
          setDepartments(data.departments);
        } else {
          // Fallback to hardcoded list
          setDepartments([
            { id: 'CSE', name: 'Computer Science Engineering' },
            { id: 'ECE', name: 'Electronics & Communication' },
            { id: 'ME', name: 'Mechanical Engineering' },
            { id: 'CE', name: 'Civil Engineering' },
            { id: 'EEE', name: 'Electrical & Electronics' },
            { id: 'IT', name: 'Information Technology' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // Fallback to hardcoded list
        setDepartments([
          { id: 'CSE', name: 'Computer Science Engineering' },
          { id: 'ECE', name: 'Electronics & Communication' },
          { id: 'ME', name: 'Mechanical Engineering' },
          { id: 'CE', name: 'Civil Engineering' },
          { id: 'EEE', name: 'Electrical & Electronics' },
          { id: 'IT', name: 'Information Technology' },
        ]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, []);

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
      <TextInput style={styles.input} placeholder="Name" onChangeText={setName} value={name} />
      <TextInput style={styles.input} placeholder="Student ID" onChangeText={setStudentID} value={studentID} />
      {loadingDepartments ? (
        <Text style={styles.loadingText}>Loading departments...</Text>
      ) : (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Department</Text>
          <Picker
            selectedValue={department}
            onValueChange={(itemValue) => setDepartment(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Department" value="" />
            {departments.map((dept) => (
              <Picker.Item 
                key={dept.id || dept.name} 
                label={dept.name} 
                value={dept.id || dept.name} 
              />
            ))}
          </Picker>
        </View>
      )}
      <TextInput style={styles.input} placeholder="Email" onChangeText={setEmail} value={email} />
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
  pickerContainer: { marginBottom: 15 },
  pickerLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  picker: { height: 40, borderBottomWidth: 1 },
  loadingText: { marginBottom: 15, color: '#666', textAlign: 'center' },
});
