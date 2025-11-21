import { registerRootComponent } from 'expo';
import { AppRegistry, LogBox } from 'react-native';

// Ignore specific warnings that might cause issues
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Wrap App in error handler
let App;
try {
  console.log('📱 Loading App component...');
  App = require('./App').default;
  console.log('✅ App component loaded successfully');
} catch (error) {
  console.error('❌ Failed to load App component:', error);
  console.error('Error stack:', error.stack);
  // Create a minimal error app
  const React = require('react');
  const { View, Text, StyleSheet } = require('react-native');
  
  App = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load app</Text>
      <Text style={styles.errorDetail}>{error.message}</Text>
      <Text style={styles.errorStack}>{error.stack}</Text>
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
      color: '#ff0000',
      marginBottom: 10,
    },
    errorDetail: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginBottom: 10,
    },
    errorStack: {
      fontSize: 10,
      color: '#999',
      textAlign: 'left',
      fontFamily: 'monospace',
    },
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log('📱 Registering root component...');
registerRootComponent(App);
console.log('✅ Root component registered');
