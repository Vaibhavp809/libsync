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
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '../../styles/designSystem';
import { authService } from '../../services/authService';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electric & Electronics',
  'Other',
];

const RegisterScreen = ({ navigation, onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    studentId: '',
    department: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { email, password, confirmPassword, firstName, lastName, studentId, department } = formData;

    if (!email || !password || !firstName || !lastName || !studentId || !department) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await authService.register(registerData);
      
      if (result.success) {
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              if (onLogin) {
                onLogin(result);
              } else {
                navigation.replace('Home');
              }
            }
          }
        ]);
      }
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={navigateToLogin}>
              <Ionicons name="arrow-back" size={24} color={designSystem.colors.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Ionicons name="library" size={48} color={designSystem.colors.primary} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join your campus library community</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Ionicons name="person-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="First Name"
                  placeholderTextColor={designSystem.colors.textSecondary}
                  value={formData.firstName}
                  onChangeText={(value) => updateField('firstName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Ionicons name="person-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Last Name"
                  placeholderTextColor={designSystem.colors.textSecondary}
                  value={formData.lastName}
                  onChangeText={(value) => updateField('lastName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Student ID"
                placeholderTextColor={designSystem.colors.textSecondary}
                value={formData.studentId}
                onChangeText={(value) => updateField('studentId', value)}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={styles.inputContainer}
              onPress={() => setShowDepartmentPicker(true)}
              disabled={isLoading}
            >
              <Ionicons name="school-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <Text style={[styles.textInput, { color: formData.department ? designSystem.colors.textPrimary : designSystem.colors.textSecondary }]}>
                {formData.department || 'Select Department'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={designSystem.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Ionicons name="at-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Email Address"
                placeholderTextColor={designSystem.colors.textSecondary}
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>


            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 50 }]}
                placeholder="Password"
                placeholderTextColor={designSystem.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
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
                  size={18} 
                  color={designSystem.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={designSystem.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 50 }]}
                placeholder="Confirm Password"
                placeholderTextColor={designSystem.colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color={designSystem.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={designSystem.colors.textLight} />
                  <Text style={styles.registerButtonText}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Already have an account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={navigateToLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>Sign In Instead</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By creating an account, you agree to the library's{'\n'}
              terms of service and privacy policy
            </Text>
          </View>
        </ScrollView>
        
        {/* Department Picker Modal */}
        <Modal
          visible={showDepartmentPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDepartmentPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Department</Text>
                <TouchableOpacity 
                  onPress={() => setShowDepartmentPicker(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={designSystem.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={DEPARTMENTS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.departmentItem,
                      formData.department === item && styles.departmentItemSelected
                    ]}
                    onPress={() => {
                      updateField('department', item);
                      setShowDepartmentPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.departmentText,
                      formData.department === item && styles.departmentTextSelected
                    ]}>
                      {item}
                    </Text>
                    {formData.department === item && (
                      <Ionicons name="checkmark" size={20} color={designSystem.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
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
    paddingTop: designSystem.spacing.lg,
    paddingBottom: designSystem.spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: designSystem.spacing.lg,
    left: 0,
    padding: designSystem.spacing.sm,
    zIndex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: designSystem.borderRadius.xl,
    backgroundColor: designSystem.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing.lg,
    marginTop: designSystem.spacing.xl,
    ...designSystem.shadows.medium,
  },
  title: {
    fontSize: 28,
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
    paddingVertical: designSystem.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designSystem.spacing.lg,
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
  halfWidth: {
    width: '48%',
    marginBottom: 0,
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
  registerButton: {
    backgroundColor: designSystem.colors.primary,
    borderRadius: designSystem.borderRadius.lg,
    paddingVertical: designSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing.lg,
    marginTop: designSystem.spacing.lg,
    ...designSystem.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButtonText: {
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
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: designSystem.colors.primary,
    borderRadius: designSystem.borderRadius.lg,
    paddingVertical: designSystem.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
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
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: designSystem.colors.background,
    borderTopLeftRadius: designSystem.borderRadius.xl,
    borderTopRightRadius: designSystem.borderRadius.xl,
    paddingBottom: designSystem.spacing.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designSystem.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designSystem.colors.textPrimary,
  },
  modalCloseButton: {
    padding: designSystem.spacing.xs,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.lg,
    paddingVertical: designSystem.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border + '30',
  },
  departmentItemSelected: {
    backgroundColor: designSystem.colors.primary + '10',
  },
  departmentText: {
    fontSize: 16,
    color: designSystem.colors.textPrimary,
  },
  departmentTextSelected: {
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;