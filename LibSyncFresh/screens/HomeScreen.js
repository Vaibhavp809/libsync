import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickStats, setQuickStats] = useState({
    activeReservations: 0,
    currentLoans: 0,
    unreadNotifications: 0,
    dueSoonBooks: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
          
          // After user data is loaded and home screen is fully rendered,
          // check and register push token ONLY if we don't already have one
          // This ensures permission dialog appears AFTER home screen loads, not during login
          setTimeout(async () => {
            try {
              const { notificationService } = require('../services/notificationService');
              const { authService } = require('../services/authService');
              
              // Check if user is authenticated
              if (authService.isAuthenticated()) {
                // Check if we already have a push token saved
                const savedToken = await notificationService.getSavedPushToken();
                
                // Only request permission if we don't have a token yet
                // This prevents showing the dialog every time the home screen loads
                if (!savedToken) {
                  console.log('📱 Home screen loaded: Requesting push notification permission...');
                  
                  try {
                    // Use the standalone function for better production build support
                    const { registerForPushNotificationsAsync } = require('../services/notificationService');
                    
                    // Request permissions and get push token (this will show permission dialog)
                    const newToken = await registerForPushNotificationsAsync();
                    
                    if (newToken) {
                      // Save token locally
                      await notificationService.savePushTokenToStorage(newToken);
                      notificationService.expoPushToken = newToken;
                      console.log('✅ Push token obtained on home screen:', newToken.substring(0, 30) + '...');
                      
                      // Send token to server
                      try {
                        await notificationService.sendPushTokenToServer(newToken);
                        console.log('✅ Push token sent to server from home screen');
                      } catch (serverError) {
                        console.warn('⚠️ Failed to send push token to server:', serverError.message);
                      }
                    } else {
                      console.warn('⚠️ No push token obtained - user may have denied notification permissions');
                      console.warn('⚠️ User can grant permissions later in device Settings');
                    }
                  } catch (tokenError) {
                    console.warn('⚠️ Error requesting push token on home screen:', tokenError.message);
                    // Check if it's a permission denial
                    if (tokenError.message && (tokenError.message.includes('permission') || tokenError.message.includes('denied'))) {
                      console.warn('⚠️ Notification permissions were denied');
                      console.warn('⚠️ User can enable notifications later in device Settings');
                    }
                  }
                } else {
                  console.log('✅ Push token already exists, no need to request permission again');
                  // Still try to send the existing token to server in case it wasn't sent before
                  try {
                    await notificationService.sendPushTokenToServer(savedToken);
                    console.log('✅ Existing push token verified with server');
                  } catch (serverError) {
                    console.warn('⚠️ Failed to verify existing push token with server:', serverError.message);
                  }
                }
              }
            } catch (error) {
              console.warn('⚠️ Error checking push token on home screen:', error.message);
            }
          }, 3000); // Wait 3 seconds for home screen to fully render before requesting permission
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

  const fetchQuickStats = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setStatsLoading(true);
      }
      if (!user?._id) {
        console.log('No user ID found for fetching stats');
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setStatsLoading(false);
        }
        return;
      }
      
      console.log('Fetching quick stats for user:', user._id);
      
      // Use the new dashboard counters endpoint
      try {
        const countersRes = await apiService.getDashboardCounters();
        console.log('Dashboard counters result:', countersRes);
        
        let stats = {
          activeReservations: countersRes.activeReservations || 0,
          currentLoans: countersRes.currentLoans || 0,
          unreadNotifications: countersRes.unreadNotifications || 0,
          dueSoonBooks: 0 // Still need to calculate this from loans
        };
        
        // Fetch loans separately to calculate due soon books
        try {
          const loansRes = await apiService.getLoans(user._id);
          let loans = [];
          if (Array.isArray(loansRes)) {
            loans = loansRes;
          } else if (loansRes.loans) {
            loans = loansRes.loans;
          } else if (loansRes.data) {
            loans = Array.isArray(loansRes.data) ? loansRes.data : [];
          }
          
          // Count books due soon (within 3 days)
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
          stats.dueSoonBooks = loans.filter(l => {
            if (l && (l.status === 'active' || l.status === 'Issued' || l.status === 'issued') && l.dueDate) {
              const dueDate = new Date(l.dueDate);
              return dueDate <= threeDaysFromNow && dueDate >= new Date();
            }
            return false;
          }).length;
        } catch (loansError) {
          console.error('Failed to fetch loans for due soon calculation:', loansError);
        }
        
        console.log('Final stats:', stats);
        setQuickStats(stats);
      } catch (countersError) {
        console.error('Failed to fetch dashboard counters, falling back to individual endpoints:', countersError);
        
        // Fallback to individual endpoints if counters endpoint fails
        const [reservationsRes, loansRes, notificationsRes] = await Promise.allSettled([
          apiService.getReservations(user._id),
          apiService.getLoans(user._id),
          apiService.getUnreadNotificationCount()
        ]);
        
        let stats = {
          activeReservations: 0,
          currentLoans: 0,
          unreadNotifications: 0,
          dueSoonBooks: 0
        };
        
        if (reservationsRes.status === 'fulfilled' && reservationsRes.value) {
          let reservations = [];
          if (Array.isArray(reservationsRes.value)) {
            reservations = reservationsRes.value;
          } else if (reservationsRes.value.reservations) {
            reservations = reservationsRes.value.reservations;
          }
          stats.activeReservations = reservations.filter(r => r && (r.status === 'Active' || r.status === 'active')).length;
        }
        
        if (loansRes.status === 'fulfilled' && loansRes.value) {
          let loans = [];
          if (Array.isArray(loansRes.value)) {
            loans = loansRes.value;
          } else if (loansRes.value.loans) {
            loans = loansRes.value.loans;
          }
          stats.currentLoans = loans.filter(l => l && (l.status === 'Issued' || l.status === 'issued')).length;
          
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
          stats.dueSoonBooks = loans.filter(l => {
            if (l && (l.status === 'Issued' || l.status === 'issued') && l.dueDate) {
              const dueDate = new Date(l.dueDate);
              return dueDate <= threeDaysFromNow && dueDate >= new Date();
            }
            return false;
          }).length;
        }
        
        if (notificationsRes.status === 'fulfilled' && notificationsRes.value) {
          stats.unreadNotifications = notificationsRes.value.unreadCount || 0;
        }
        
        setQuickStats(stats);
      }
      
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
      setQuickStats({
        activeReservations: 0,
        currentLoans: 0,
        unreadNotifications: 0,
        dueSoonBooks: 0
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setStatsLoading(false);
      }
    }
  }, [user]);

  // Fetch quick stats when user is loaded
  useEffect(() => {
    if (user) {
      fetchQuickStats();
    }
  }, [user, fetchQuickStats]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchQuickStats();
      }
    }, [user, fetchQuickStats])
  );

  const onRefresh = async () => {
    await fetchQuickStats(true);
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
      id: 'eresources',
      title: 'E-Resources',
      subtitle: 'Digital learning materials',
      icon: '💻',
      color: colors.info,
      onPress: () => navigation.navigate('EResources')
    },
    {
      id: 'libraryUpdates',
      title: 'Library Updates',
      subtitle: 'Latest news & announcements',
      icon: '📰',
      color: colors.warning,
      onPress: () => navigation.navigate('LibraryUpdates')
    },
    // Removed notifications card - now handled by bell icon in header
    // Removed logout - now handled by drawer menu
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
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
          <Text style={styles.sectionTitle}>Your Library Activity</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, quickStats.activeReservations > 0 && styles.statCardActive]}
              onPress={() => navigation.navigate('MyReservations')}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>
                {statsLoading ? '...' : quickStats.activeReservations}
              </Text>
              <Text style={styles.statEmoji}>📌</Text>
              <Text style={styles.statLabel}>Active{"\n"}Reservations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statCard, quickStats.currentLoans > 0 && styles.statCardActive]}
              onPress={() => navigation.navigate('LoanHistory')}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>
                {statsLoading ? '...' : quickStats.currentLoans}
              </Text>
              <Text style={styles.statEmoji}>📚</Text>
              <Text style={styles.statLabel}>Current{"\n"}Loans</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, quickStats.dueSoonBooks > 0 && styles.statCardWarning]}
              onPress={() => navigation.navigate('LoanHistory')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, quickStats.dueSoonBooks > 0 && styles.statNumberWarning]}>
                {statsLoading ? '...' : quickStats.dueSoonBooks}
              </Text>
              <Text style={styles.statEmoji}>⏰</Text>
              <Text style={styles.statLabel}>Due{"\n"}Soon</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statCard, quickStats.unreadNotifications > 0 && styles.statCardNotification]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, quickStats.unreadNotifications > 0 && styles.statNumberNotification]}>
                {statsLoading ? '...' : quickStats.unreadNotifications}
              </Text>
              <Text style={styles.statEmoji}>🔔</Text>
              <Text style={styles.statLabel}>Unread{"\n"}Notifications</Text>
            </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.container,
    backgroundColor: colors.background,
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
  },
  
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl, // Add more top padding
    paddingBottom: spacing.xl, // Add bottom padding for footer visibility
    marginTop: -spacing.lg, // Overlap with header
  },
  
  welcomeSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.md, // Add top margin
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
    marginBottom: spacing.lg,
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
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    marginHorizontal: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.small,
    // Add subtle gradient effect with overlay
    position: 'relative',
  },
  
  statCardActive: {
    backgroundColor: '#90D5FF',
    borderColor: '#57B9FF',
    borderWidth: 2,
    ...shadows.large,
    transform: [{ scale: 1.02 }],
  },
  
  statCardWarning: {
    backgroundColor: 'aedaf5ff',
    borderColor: '#57B9FF',
    borderWidth: 2,
    ...shadows.large,
    transform: [{ scale: 1.02 }],
  },
  
  statCardNotification: {
    backgroundColor: '#aedaf5ff',
    borderColor: '#57B9FF',
    borderWidth: 2,
    ...shadows.large,
    transform: [{ scale: 1.02 }],
  },
  
  statNumber: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
    // Add shadow for depth
    textShadowColor: colors.primary + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  statNumberWarning: {
    color: '#57B9FF',
    textShadowColor: '#57B9FF' + '40',
  },
  
  statNumberNotification: {
    color: '#57B9FF',
    textShadowColor: '#57B9FF' + '40',
  },
  
  statEmoji: {
    fontSize: 20,
    marginBottom: spacing.xs,
    // Add emoji shadow effect
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  statLabel: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontSize: 11,
  },
  
  navigationSection: {
    marginBottom: spacing.xl,
  },
  
  navCardsContainer: {
    gap: spacing.lg, // Increased from spacing.md
  },
  
  navCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl, // Increased from spacing.lg
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
  },
  
  footerText: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textShadowColor: colors.primary + '30',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
