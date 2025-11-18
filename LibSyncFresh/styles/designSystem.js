// Design System for LibSync - College Student Friendly UI
import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color Palette - Modern, vibrant but professional
export const colors = {
  // Primary Colors - University/Academic feel
  primary: '#2563EB',        // Classic blue
  primaryLight: '#3B82F6',   // Lighter blue
  primaryDark: '#1D4ED8',    // Darker blue
  
  // Secondary Colors - Warm and approachable
  secondary: '#F59E0B',      // Amber/Gold
  secondaryLight: '#FCD34D', // Light amber
  secondaryDark: '#D97706',  // Dark amber
  
  // Success/Available
  success: '#10B981',        // Emerald green
  successLight: '#34D399',   // Light green
  successDark: '#059669',    // Dark green
  
  // Warning/Reserved
  warning: '#F59E0B',        // Amber
  warningLight: '#FCD34D',   // Light amber
  warningDark: '#D97706',    // Dark amber
  
  // Error/Unavailable
  error: '#EF4444',          // Red
  errorLight: '#F87171',     // Light red
  errorDark: '#DC2626',      // Dark red
  
  // Neutral Colors
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background Colors
  background: '#F8FAFC',     // Very light blue-gray
  backgroundSecondary: '#F1F5F9', // Light blue-gray
  surface: '#FFFFFF',        // Pure white
  surfaceLight: '#F1F5F9',   // Light blue-gray
  
  // Text Colors
  textPrimary: '#1F2937',    // Dark gray
  textSecondary: '#6B7280',  // Medium gray
  textTertiary: '#9CA3AF',   // Light gray
  textLight: '#FFFFFF',      // White text
  textInverse: '#FFFFFF',    // White text
  
  // Border Colors
  border: '#E5E7EB',         // Light gray border
  
  // Status Colors
  available: '#10B981',      // Green
  reserved: '#F59E0B',       // Amber
  borrowed: '#3B82F6',       // Blue
  overdue: '#EF4444',        // Red
  returned: '#6B7280',       // Gray
};

// Typography Scale
export const typography = {
  // Display text
  displayLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  
  // Headings
  heading1: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  
  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  
  // Labels and captions
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  
  // Button text
  buttonLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonMedium: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
};

// Spacing Scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
  // Legacy names for backward compatibility
  small: 6,
  medium: 12,
  large: 16,
  xlarge: 24,
};

// Shadows
export const shadows = {
  small: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xlarge: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
};

// Common Component Styles
export const components = {
  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    ...shadows.medium,
  },
  
  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    ...shadows.large,
  },
  
  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  
  buttonSuccess: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Input fields
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    ...shadows.small,
  },
  
  // Headers
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  
  // Status badges
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
  },
};

// Layout helpers
export const layout = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  contentContainer: {
    padding: spacing.md,
  },
  
  section: {
    marginBottom: spacing.lg,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  screenWidth,
  screenHeight,
};

// Status helpers
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'available':
      return colors.available;
    case 'reserved':
      return colors.reserved;
    case 'borrowed':
    case 'active':
      return colors.borrowed;
    case 'overdue':
      return colors.overdue;
    case 'returned':
    case 'completed':
      return colors.returned;
    default:
      return colors.gray500;
  }
};

export const getStatusBackgroundColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'available':
      return colors.success + '20'; // 20% opacity
    case 'reserved':
      return colors.warning + '20';
    case 'borrowed':
    case 'active':
      return colors.primary + '20';
    case 'overdue':
      return colors.error + '20';
    case 'returned':
    case 'completed':
      return colors.gray500 + '20';
    default:
      return colors.gray300 + '20';
  }
};

// Unified designSystem export
export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  layout,
  getStatusColor,
  getStatusBackgroundColor,
};

// Default export for backward compatibility
export default designSystem;
