import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, ActivityIndicator } from 'react-native';
import axios from 'axios';

export default function BookListScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      const res = await axios.get('http://172.19.139.218:5000/api/books');
      setBooks(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Error fetching books");
    }
  };

  const reserveBook = async (bookId) => {
    try {
      const [studentId, setStudentId] = useState("");

useEffect(() => {
  const loadStudent = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (userData) setStudentId(JSON.parse(userData)._id);
  };
  loadStudent();
}, []); // 🔁 Replace with logged-in student ID
      const res = await axios.post('http://172.19.139.218:5000/api/reservations/reserve', {
        bookId,
        studentId
      });
      alert("Book reserved!");
      fetchBooks(); // Refresh list
    } catch (err) {
      alert("Reservation failed");
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text>Author: {item.author}</Text>
      <Text>Category: {item.category}</Text>
      <Text>Status: {item.status}</Text>
      {item.status === "Available" && (
        <Button title="Reserve" onPress={() => reserveBook(item._id)} />
      )}
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 30 }} />;

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
  container: { flex: 1, padding: 10 },
  card: { marginBottom: 15, padding: 15, backgroundColor: "#f2f2f2", borderRadius: 10 },
  title: { fontSize: 18, fontWeight: 'bold' }
});
