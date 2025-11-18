import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

// Wrap App in error handler
let App;
try {
  App = require('./App').default;
} catch (error) {
  console.error('Failed to load App component:', error);
  // Create a minimal error app
  const React = require('react');
  const { View, Text, StyleSheet } = require('react-native');
  
  App = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load app</Text>
      <Text style={styles.errorDetail}>{error.message}</Text>
    </View>
  );
  
  const styles = StyleSheet.create({
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#000',
      marginBottom: 10,
    },
    errorDetail: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
    },
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
