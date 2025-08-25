import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function LoanHistoryScreen() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      const student = JSON.parse(user);
      const res = await axios.get(`http://172.19.139.218:5000/api/loans/student/${student._id}`);
      setLoans(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch loan history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.book.title}</Text>
      <Text>Author: {item.book.author}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Issued: {new Date(item.issueDate).toLocaleDateString()}</Text>
      <Text>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      {item.returnDate && <Text>Returned: {new Date(item.returnDate).toLocaleDateString()}</Text>}
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        keyExtractor={item => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  card: {
    backgroundColor: "#e0f7fa",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10
  },
  title: { fontSize: 18, fontWeight: 'bold' }
});
