import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '../../styles/designSystem';
import { authService } from '../../services/authService';

const LoginScreen = ({ navigation, onLogin }) => {
  const [emailOrStudentId, setEmailOrStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!emailOrStudentId || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.login(emailOrStudentId.trim(), password);
      
      if (result.success) {
        // Store legacy userData format for backward compatibility
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              if (onLogin) {
                onLogin(result);
              } else {
                navigation.replace('Main');
              }
            }
          }
        ]);
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="library" size={64} color={designSystem.colors.primary} />
            </View>
            <Text style={styles.title}>LibSync</Text>
            <Text style={styles.subtitle}>Welcome back to your campus library</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email or Student ID"
                placeholderTextColor={designSystem.colors.textSecondary}
                value={emailOrStudentId}
                onChangeText={setEmailOrStudentId}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 50 }]}
                placeholder="Password"
                placeholderTextColor={designSystem.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={designSystem.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={designSystem.colors.textLight} />
                  <Text style={styles.loginButtonText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={navigateToRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Need help accessing your account?{'\n'}
              Contact the library front desk
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: designSystem.spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: designSystem.spacing.xxl,
    paddingBottom: designSystem.spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: designSystem.borderRadius.xl,
    backgroundColor: designSystem.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing.lg,
    ...designSystem.shadows.medium,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: designSystem.colors.textPrimary,
    marginBottom: designSystem.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: designSystem.colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: designSystem.spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.backgroundSecondary,
    borderRadius: designSystem.borderRadius.lg,
    paddingHorizontal: designSystem.spacing.md,
    paddingVertical: designSystem.spacing.sm,
    marginBottom: designSystem.spacing.lg,
    borderWidth: 1,
    borderColor: designSystem.colors.border,
    ...designSystem.shadows.small,
  },
  inputIcon: {
    marginRight: designSystem.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: designSystem.colors.textPrimary,
    paddingVertical: designSystem.spacing.sm,
  },
  passwordToggle: {
    position: 'absolute',
    right: designSystem.spacing.md,
    padding: designSystem.spacing.xs,
  },
  loginButton: {
    backgroundColor: designSystem.colors.primary,
    borderRadius: designSystem.borderRadius.lg,
    paddingVertical: designSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing.lg,
    ...designSystem.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: designSystem.colors.textLight,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: designSystem.spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: designSystem.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designSystem.colors.border,
  },
  dividerText: {
    color: designSystem.colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: designSystem.spacing.md,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: designSystem.colors.primary,
    borderRadius: designSystem.borderRadius.lg,
    paddingVertical: designSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: designSystem.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: designSystem.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: designSystem.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;