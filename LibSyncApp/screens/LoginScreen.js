 
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


    const handleLogin = async () => {
    try {
        const res = await axios.post('http://172.19.139.218:5000/api/auth/login', { email, password});

        // Store token and user
        await AsyncStorage.setItem('token', res.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));

        navigation.navigate("Home");
    } catch (err) {
        alert("Login failed");
    }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LibSync Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      <Text onPress={() => navigation.navigate('Register')} style={styles.link}>
        Don't have an account? Register
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { height: 40, borderBottomWidth: 1, marginBottom: 20 },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center' },
  link: { marginTop: 20, textAlign: 'center', color: 'blue' },
});
