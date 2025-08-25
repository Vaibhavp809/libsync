import React, { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import axios from 'axios';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [book, setBook] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
      const res = await axios.get(`http:// 172.19.139.218:5000/api/books/isbn/${data}`);
      setBook(res.data);
    } catch (error) {
      Alert.alert("Book Not Found", "No book matches this ISBN.");
      setBook(null);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.result}>
          {book ? (
            <>
              <Text style={styles.title}>{book.title}</Text>
              <Text>Author: {book.author}</Text>
              <Text>Category: {book.category}</Text>
              <Text>Status: {book.status}</Text>
            </>
          ) : (
            <Text>No book found.</Text>
          )}
          <Button title={'Scan Again'} onPress={() => { setScanned(false); setBook(null); }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});
