import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try new format first, fallback to legacy
        let data = await AsyncStorage.getItem('user_data');
        if (!data) {
          data = await AsyncStorage.getItem('userData');
        }
        
        if (data) {
          setUser(JSON.parse(data));
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadUser();
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timeInterval);
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.replace("Login");
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const navigationItems = [
    {
      id: 'books',
      title: 'Search Books',
      subtitle: 'Find your next read',
      icon: '📚',
      color: colors.primary,
      onPress: () => navigation.navigate('Books')
    },
    {
      id: 'scanner',
      title: 'Barcode Scanner',
      subtitle: 'Scan book barcodes',
      icon: '📱',
      color: colors.secondary,
      onPress: () => navigation.navigate('Scanner')
    },
    {
      id: 'attendance',
      title: 'Attendance',
      subtitle: 'Quick check-in',
      icon: '✅',
      color: colors.success,
      onPress: () => navigation.navigate('AttendanceScanner')
    },
    {
      id: 'reservations',
      title: 'My Reservations',
      subtitle: 'Track reserved books',
      icon: '📌',
      color: colors.warning,
      onPress: () => navigation.navigate('MyReservations')
    },
    {
      id: 'loans',
      title: 'Loan History',
      subtitle: 'Your reading journey',
      icon: '🔁',
      color: colors.info,
      onPress: () => navigation.navigate('LoanHistory')
    },
    {
      id: 'logout',
      title: 'Logout',
      subtitle: 'Sign out safely',
      icon: '🚪',
      color: colors.error,
      onPress: handleLogout
    }
  ];

  const renderNavigationCard = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.navCard, { borderLeftColor: item.color }]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.navCardContent}>
          <View style={[styles.navIcon, { backgroundColor: item.color + '20' }]}>
            <Text style={styles.navEmoji}>{item.icon}</Text>
          </View>
          <View style={styles.navTextContainer}>
            <Text style={styles.navTitle}>{item.title}</Text>
            <Text style={styles.navSubtitle}>{item.subtitle}</Text>
          </View>
          <View style={styles.navArrow}>
            <Text style={styles.navArrowText}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>LibSync</Text>
          <Text style={styles.headerSubtitle}>Your Digital Library Companion</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeCard}>
            <Text style={styles.greeting}>{getGreeting()}! 👋</Text>
            {user ? (
              <>
                <Text style={styles.welcomeText}>
                  Welcome back, <Text style={styles.userName}>{user.name}</Text> 🎓
                </Text>
                <View style={styles.userInfoContainer}>
                  <View style={styles.userInfoItem}>
                    <Text style={styles.userInfoLabel}>Student ID:</Text>
                    <Text style={styles.userInfoValue}>{user.studentID}</Text>
                  </View>
                  {user.department && (
                    <View style={styles.userInfoItem}>
                      <Text style={styles.userInfoLabel}>Department:</Text>
                      <Text style={styles.userInfoValue}>{user.department}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.welcomeText}>Welcome to LibSync! 📚</Text>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>📖</Text>
              <Text style={styles.statLabel}>Books Available</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⏰</Text>
              <Text style={styles.statLabel}>Quick Access</Text>
            </View>
          </View>
        </View>

        {/* Navigation Cards */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <View style={styles.navCardsContainer}>
            {navigationItems.map(renderNavigationCard)}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for students
          </Text>
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
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  
  headerContent: {
    alignItems: 'center',
  },
  
  headerTitle: {
    ...typography.displayMedium,
    color: colors.textInverse,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    opacity: 0.9,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg, // Overlap with header
  },
  
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  
  welcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
  },
  
  greeting: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  
  welcomeText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  
  userName: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '600',
  },
  
  userInfoContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  
  userInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  userInfoLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  userInfoValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  
  statsSection: {
    marginBottom: spacing.xl,
  },
  
  sectionTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  
  statEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  
  statLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  navigationSection: {
    marginBottom: spacing.xl,
  },
  
  navCardsContainer: {
    gap: spacing.md,
  },
  
  navCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  
  navCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  navIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  navEmoji: {
    fontSize: 24,
  },
  
  navTextContainer: {
    flex: 1,
  },
  
  navTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  navSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  
  navArrow: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  navArrowText: {
    ...typography.displaySmall,
    color: colors.gray400,
    fontWeight: '300',
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  
  footerText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
