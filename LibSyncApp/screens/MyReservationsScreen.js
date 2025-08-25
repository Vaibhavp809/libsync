import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, ActivityIndicator } from 'react-native';
import axios from 'axios';

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [studentId, setStudentId] = useState("");

useEffect(() => {
  const loadStudent = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (userData) setStudentId(JSON.parse(userData)._id);
  };
  loadStudent();
}, []); // ✅ Replace with logged-in user's ID in future

  const fetchReservations = async () => {
    try {
      const res = await axios.get(`http://172.19.139.218:5000/api/reservations/student/${studentId}`);
      setReservations(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch reservations");
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      await axios.put(`http://172.19.139.218:5000/api/reservations/cancel/${reservationId}`);
      alert("Reservation cancelled");
      fetchReservations(); // Refresh list
    } catch (err) {
      alert("Failed to cancel");
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.book.title}</Text>
      <Text>Author: {item.book.author}</Text>
      <Text>Category: {item.book.category}</Text>
      <Text>Status: {item.status}</Text>
      <Text>Reserved At: {new Date(item.reservedAt).toLocaleDateString()}</Text>
      {item.status === "Active" && (
        <Button title="Cancel" onPress={() => cancelReservation(item._id)} />
      )}
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 30 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
        keyExtractor={item => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  card: { backgroundColor: "#f5f5f5", marginBottom: 15, padding: 15, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: 'bold' }
});
