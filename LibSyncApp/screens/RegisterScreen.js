 import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import axios from 'axios';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [studentID, setStudentID] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const res = await axios.post('http://172.19.139.218:5000/api/auth/register', {
        name, email, password, role: 'student', studentID, department
      });
      console.log(res.data);
      alert("Registered successfully");
      navigation.navigate("Login");
    } catch (err) {
      alert("Registration failed");
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
      <Button title="Register" onPress={handleRegister} />
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
});
