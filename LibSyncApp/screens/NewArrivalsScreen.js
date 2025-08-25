import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';

export default function NewArrivalsScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNewBooks = async () => {
    try {
      const res = await axios.get('http://172.19.139.218:5000/api/books/new');
      setBooks(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load new arrivals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewBooks();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text>Author: {item.author}</Text>
      <Text>Category: {item.category}</Text>
      <Text>Added: {new Date(item.addedOn).toLocaleDateString()}</Text>
      <Text>Status: {item.status}</Text>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={item => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  card: {
    backgroundColor: "#fff3e0",
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3
  },
  title: { fontSize: 18, fontWeight: 'bold' }
});
