import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/apiConfig';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function ApiSettingsScreen() {
  const [currentMode, setCurrentMode] = useState(null);
  const [currentServer, setCurrentServer] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const mode = await AsyncStorage.getItem('api_mode');
      const server = await apiConfig.getCurrentServerIP();
      setCurrentMode(mode || 'real');
      setCurrentServer(server);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableMockMode = async () => {
    try {
      await AsyncStorage.setItem('api_mode', 'mock');
      setCurrentMode('mock');
      Alert.alert(
        'Mock Mode Enabled ✅',
        'The app will now use demo data for all screens. This is useful when the server is not available.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to enable mock mode:', error);
      Alert.alert('Error', 'Failed to enable mock mode');
    }
  };

  const enableRealApiMode = async () => {
    try {
      await AsyncStorage.removeItem('api_mode');
      setCurrentMode('real');
      Alert.alert(
        'Real API Mode Enabled ✅',
        'The app will now try to connect to the actual server.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to enable real API mode:', error);
      Alert.alert('Error', 'Failed to enable real API mode');
    }
  };

  const testServerConnection = async () => {
    setTestingConnection(true);
    try {
      // Test various endpoints to diagnose the issue
      const endpoints = [
        '/api/health',
        '/api/books',
        '/api/books/new',
      ];

      let results = [];
      
      for (const endpoint of endpoints) {
        try {
          const fullUrl = await apiConfig.getEndpoint(endpoint);
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          results.push({
            endpoint,
            status: response.status,
            ok: response.ok,
            error: null
          });
        } catch (error) {
          results.push({
            endpoint,
            status: null,
            ok: false,
            error: error.message
          });
        }
      }

      // Show results
      const resultText = results.map(r => 
        `${r.endpoint}: ${r.ok ? '✅ OK' : '❌ FAILED'} ${r.status ? `(${r.status})` : ''} ${r.error ? `- ${r.error}` : ''}`
      ).join('\n');

      const hasFailures = results.some(r => !r.ok);
      const has403 = results.some(r => r.status === 403);

      let message = `Connection Test Results:\n\n${resultText}\n\n`;
      
      if (has403) {
        message += '🔍 Diagnosis: HTTP 403 errors suggest the server requires authentication tokens that are missing from the requests.';
      } else if (hasFailures) {
        message += '🔍 Diagnosis: Server connection issues detected. Consider using Mock Mode for testing.';
      } else {
        message += '✅ All endpoints are working correctly!';
      }

      Alert.alert('Connection Test Results', message);
      
    } catch (error) {
      Alert.alert('Test Failed', `Unable to test server connection: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const resetServerConfig = async () => {
    try {
      await apiConfig.resetServerConfig();
      await loadCurrentSettings();
      Alert.alert(
        'Server Config Reset ✅', 
        'Server configuration has been reset to auto-detection mode.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reset server configuration');
    }
  };

  const setProductionURL = async () => {
    try {
      const success = await apiConfig.setServerIP('https://libsync-o0s8.onrender.com');
      if (success) {
        await loadCurrentSettings();
        Alert.alert(
          'Production URL Set ✅',
          'The app will now use the production Render backend: https://libsync-o0s8.onrender.com'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set production URL');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ API Settings</Text>
        <Text style={styles.headerSubtitle}>Configure your app's data connection</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Current Configuration</Text>
            <View style={[styles.statusIndicator, {
              backgroundColor: currentMode === 'mock' ? colors.warning : colors.success
            }]} />
          </View>
          
          <View style={styles.configRow}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>API Mode</Text>
              <View style={styles.configValueContainer}>
                <Text style={[styles.configIcon, { 
                  color: currentMode === 'mock' ? colors.warning : colors.success 
                }]}>
                  {currentMode === 'mock' ? '🧪' : '🌐'}
                </Text>
                <Text style={[styles.configValue, {
                  color: currentMode === 'mock' ? colors.warning : colors.success
                }]}>
                  {currentMode === 'mock' ? 'Demo Mode' : 'Live Server'}
                </Text>
              </View>
            </View>
            
            <View style={styles.configDivider} />
            
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Server Address</Text>
              <Text style={styles.configValue}>{currentServer}</Text>
            </View>
          </View>
        </View>

        <View style={styles.modeSection}>
          <Text style={styles.sectionTitle}>API Connection Mode</Text>
          
          <View style={styles.modeGrid}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                currentMode === 'mock' && styles.modeCardActive
              ]}
              onPress={enableMockMode}
              activeOpacity={0.8}
            >
              <View style={styles.modeIconContainer}>
                <Text style={styles.modeIcon}>🧪</Text>
              </View>
              <Text style={styles.modeTitle}>Demo Mode</Text>
              <Text style={styles.modeDescription}>Use sample data for testing and exploration</Text>
              {currentMode === 'mock' && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>✓ Active</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                currentMode === 'real' && styles.modeCardActive
              ]}
              onPress={enableRealApiMode}
              activeOpacity={0.8}
            >
              <View style={styles.modeIconContainer}>
                <Text style={styles.modeIcon}>🌐</Text>
              </View>
              <Text style={styles.modeTitle}>Live Server</Text>
              <Text style={styles.modeDescription}>Connect to the actual library database</Text>
              {currentMode === 'real' && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>✓ Active</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.toolsSection}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          
          <TouchableOpacity
            style={[styles.toolButton, testingConnection && styles.toolButtonDisabled]}
            onPress={testServerConnection}
            disabled={testingConnection}
            activeOpacity={0.8}
          >
            <View style={styles.toolButtonContent}>
              <View style={styles.toolIconContainer}>
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <Text style={styles.toolIcon}>🔍</Text>
                )}
              </View>
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>
                  {testingConnection ? 'Testing Connection...' : 'Test Server Connection'}
                </Text>
                <Text style={styles.toolDescription}>Check API endpoints and diagnose connection issues</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={setProductionURL}
            activeOpacity={0.8}
          >
            <View style={styles.toolButtonContent}>
              <View style={styles.toolIconContainer}>
                <Text style={styles.toolIcon}>🌐</Text>
              </View>
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>Use Production Server</Text>
                <Text style={styles.toolDescription}>Connect to Render production backend (https://libsync-o0s8.onrender.com)</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={resetServerConfig}
            activeOpacity={0.8}
          >
            <View style={styles.toolButtonContent}>
              <View style={styles.toolIconContainer}>
                <Text style={styles.toolIcon}>🔄</Text>
              </View>
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>Reset Server Configuration</Text>
                <Text style={styles.toolDescription}>Restore default settings and auto-detect server</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Troubleshooting Guide</Text>
          
          <View style={styles.troubleshootCard}>
            <View style={styles.troubleshootHeader}>
              <Text style={styles.troubleshootIcon}>⚠️</Text>
              <Text style={styles.troubleshootTitle}>Common Issues</Text>
            </View>
            
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootLabel}>HTTP 403 Forbidden Errors</Text>
              <Text style={styles.troubleshootText}>Server requires authentication that isn't being provided. Switch to Demo Mode while this is resolved.</Text>
            </View>
            
            <View style={styles.troubleshootDivider} />
            
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootLabel}>Connection Timeouts</Text>
              <Text style={styles.troubleshootText}>Network issues or server downtime. Try the connection test or use Demo Mode as a fallback.</Text>
            </View>
            
            <View style={styles.troubleshootDivider} />
            
            <View style={styles.troubleshootItem}>
              <Text style={styles.troubleshootLabel}>For Students</Text>
              <Text style={styles.troubleshootText}>If you're experiencing issues, Demo Mode provides full functionality with sample data for learning and testing.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.container,
  },
  
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  headerTitle: {
    ...typography.displaySmall,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    padding: spacing.md,
  },
  
  statusCard: {
    ...components.card,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  
  statusHeader: {
    ...layout.spaceBetween,
    marginBottom: spacing.md,
  },
  
  statusTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  configRow: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.small,
    padding: spacing.md,
  },
  
  configItem: {
    paddingVertical: spacing.sm,
  },
  
  configLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  configValueContainer: {
    ...layout.row,
  },
  
  configIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  
  configValue: {
    ...typography.bodyLarge,
    fontWeight: '600',
  },
  
  configDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.sm,
  },
  
  modeSection: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  modeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  modeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray200,
    ...shadows.small,
  },
  
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  
  modeIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  
  modeIcon: {
    fontSize: 28,
  },
  
  modeTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  modeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  
  activeIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  
  activeIndicatorText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '600',
  },
  
  toolsSection: {
    marginBottom: spacing.lg,
  },
  
  toolButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  
  toolButtonDisabled: {
    opacity: 0.6,
  },
  
  toolButtonContent: {
    ...layout.row,
  },
  
  toolIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.secondaryLight + '20',
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  toolIcon: {
    fontSize: 20,
  },
  
  toolTextContainer: {
    flex: 1,
  },
  
  toolTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  toolDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  helpSection: {
    marginBottom: spacing.lg,
  },
  
  troubleshootCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.small,
  },
  
  troubleshootHeader: {
    ...layout.row,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  
  troubleshootIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  
  troubleshootTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  
  troubleshootItem: {
    marginBottom: spacing.md,
  },
  
  troubleshootLabel: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  
  troubleshootText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  troubleshootDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 5,
    marginTop: 10,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  mockMode: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  realMode: {
    color: '#059669',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeButton: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  mockButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  realButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  testButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  resetButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  helpCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  helpText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  helpTitle: {
    fontWeight: 'bold',
  },
});
