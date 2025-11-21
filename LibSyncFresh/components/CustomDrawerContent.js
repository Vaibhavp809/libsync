import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/designSystem';

export default function CustomDrawerContent({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      let userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        userData = await AsyncStorage.getItem('userData');
      }
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to logout properly');
            }
          },
        },
      ]
    );
  };

  const drawerItems = [
    {
      name: 'Home',
      label: 'Home',
      icon: 'home',
      color: colors.primary,
    },
    {
      name: 'Books',
      label: 'Search Books',
      icon: 'book-search',
      color: colors.secondary,
    },
    {
      name: 'MyReservations',
      label: 'Reservations',
      icon: 'bookmark',
      color: colors.warning,
    },
    {
      name: 'LoanHistory',
      label: 'Loan History',
      icon: 'history',
      color: colors.info,
    },
    {
      name: 'AttendanceScanner',
      label: 'Attendance',
      icon: 'qrcode-scan',
      color: colors.success,
    },
    {
      name: 'LibraryUpdates',
      label: 'Library Updates',
      icon: 'newspaper',
      color: colors.warning,
    },
    {
      name: 'EResources',
      label: 'E-Resources',
      icon: 'laptop',
      color: colors.info,
    },
    {
      name: 'Notifications',
      label: 'Notifications',
      icon: 'bell',
      color: colors.secondary,
    },
  ];

  const renderDrawerItem = (item, index) => {
    const isActive = navigation.getState().routeNames[navigation.getState().index] === item.name;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.drawerItem,
          isActive && styles.activeDrawerItem,
        ]}
        onPress={() => {
          navigation.navigate(item.name);
          navigation.closeDrawer();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={isActive ? colors.white : item.color}
          />
        </View>
        <Text style={[styles.drawerItemText, isActive && styles.activeDrawerItemText]}>
          {item.label}
        </Text>
        {isActive && (
          <View style={styles.activeIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons
              name="account"
              size={40}
              color={colors.white}
            />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user?.name || 'Student'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || ''}
            </Text>
            {user?.studentID && (
              <Text style={styles.userID}>
                USN: {user.studentID}
              </Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
        <View style={styles.drawerSection}>
          {drawerItems.map((item, index) => renderDrawerItem(item, index))}
        </View>

        <View style={styles.separator} />

        {/* Logout Item */}
        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
            <MaterialCommunityIcons
              name="logout"
              size={22}
              color={colors.error}
            />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>LibSync v1.0.0</Text>
        <Text style={styles.footerSubtext}>Digital Library Companion</Text>
        <Text style={styles.footerLoveText}>Made with ❤️ for students</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.medium,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.white + '30',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.heading3,
    color: colors.white,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.white + 'CC',
    marginBottom: spacing.xs,
  },
  userID: {
    ...typography.labelMedium,
    color: colors.white + 'AA',
    fontWeight: '500',
  },
  drawerContent: {
    flex: 1,
    paddingTop: spacing.md,
  },
  drawerSection: {
    paddingHorizontal: spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  activeDrawerItem: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  drawerItemText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  activeDrawerItemText: {
    color: colors.white,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: '60%',
    backgroundColor: colors.white,
    borderRadius: 2,
    position: 'absolute',
    right: 0,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    marginHorizontal: spacing.lg,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  logoutText: {
    ...typography.bodyLarge,
    color: colors.error,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerSubtext: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  footerLoveText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.8,
  },
});
