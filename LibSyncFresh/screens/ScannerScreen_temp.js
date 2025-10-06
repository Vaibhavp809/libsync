import React, { useState } from 'react';
import { Text, View, Button, StyleSheet, Alert, TextInput } from 'react-native';
import { apiConfig } from '../config/apiConfig';

export default function ScannerScreen() {
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleManualSearch = async () => {
    if (!isbn.trim()) {
      Alert.alert("Error", "Please enter an ISBN");
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = await apiConfig.getEndpoint(`/books/isbn/${isbn}`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Book not found');
      }
      
      const bookData = await response.json();
      setBook(bookData);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert("Book Not Found", "No book matches this ISBN or unable to connect to server.");
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.title}>📚 Book Scanner</Text>
        <Text style={styles.subtitle}>Enter ISBN manually for now</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter ISBN (e.g., 9781234567890)"
          value={isbn}
          onChangeText={setIsbn}
          keyboardType="numeric"
        />
        
        <Button 
          title={loading ? "Searching..." : "Search Book"} 
          onPress={handleManualSearch}
          disabled={loading}
        />
      </View>
      
      {book && (
        <View style={styles.result}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text>Author: {book.author}</Text>
          <Text>Category: {book.category}</Text>
          <Text>Status: {book.status}</Text>
          <Button 
            title="Search Another Book" 
            onPress={() => { setBook(null); setIsbn(''); }} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    fontSize: 16
  },
  result: { 
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  bookTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#333'
  },
});
