import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, StatusBar, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { colors, typography, spacing, borderRadius, shadows, components, layout, getStatusColor, getStatusBackgroundColor } from '../styles/designSystem';
import { toLocalDateString, normalizeTimestamp } from '../src/utils/time';

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState("");


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const fetchReservations = async (isRefresh = false) => {
    if (!studentId) {
      return;
    }
    
    if (!isRefresh) setLoading(true);
    try {
      const data = await apiService.getReservations(studentId);
      
      if (Array.isArray(data)) {
        // Sort reservations by reservedAt in descending order (newest first)
        const sortedReservations = [...data].sort((a, b) => {
          const dateA = new Date(a.reservedAt || a.createdAt || 0);
          const dateB = new Date(b.reservedAt || b.createdAt || 0);
          return dateB - dateA; // Descending order (newest first)
        });
        setReservations(sortedReservations);
      } else {
        throw new Error('Invalid reservations data format');
      }
    } catch (err) {
      Alert.alert(
        'Error Loading Reservations',
        err.message || 'Failed to load reservations from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchReservations() },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      await apiService.cancelReservation(reservationId);
      
      Alert.alert('Success', 'Reservation cancelled successfully!', [
        { text: 'OK', onPress: () => fetchReservations() }
      ]);
    } catch (err) {
      if (err.message.includes('Session expired') || err.message.includes('not authenticated')) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to cancel reservations.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to cancel reservation');
      }
    }
  };

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        // Try new format first, fallback to legacy
        let userData = await AsyncStorage.getItem('user_data');
        if (!userData) {
          userData = await AsyncStorage.getItem('userData');
        }
        
        if (userData) {
          const user = JSON.parse(userData);
          setStudentId(user._id || user.id);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadStudentData();
  }, []);
  
  useEffect(() => {
    if (studentId) {
      fetchReservations();
    }
  }, [studentId]);

  const renderItem = ({ item }) => {
    const reservedDateMs = normalizeTimestamp(item.reservedAt);
    const reservedDate = reservedDateMs ? new Date(reservedDateMs) : null;
    const daysPassed = reservedDate ? Math.floor((Date.now() - reservedDateMs) / (1000 * 60 * 60 * 24)) : 0;
    
    return (
      <View style={styles.reservationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.bookIconContainer}>
            <Text style={styles.bookIcon}>📖</Text>
          </View>
          <View style={styles.reservationInfo}>
            <Text style={styles.bookTitle}>{item.book?.title || 'Unknown Book'}</Text>
            <Text style={styles.bookAuthor}>by {item.book?.author || 'Unknown Author'}</Text>
            <Text style={styles.bookCategory}>{item.book?.category || 'Unknown Category'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.reservationDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Reserved Date:</Text>
            <Text style={styles.detailValue}>{toLocalDateString(reservedDateMs)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Duration:</Text>
            <Text style={styles.detailValue}>{daysPassed} {daysPassed === 1 ? 'day' : 'days'} ago</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📊 Status:</Text>
            <Text style={[styles.detailValue, { color: getStatusColor(item.status) }]}>
              {item.status === 'Active' ? 'Active' : item.status === 'Cancelled' ? 'Cancelled' : item.status}
            </Text>
          </View>
        </View>
        
        {item.status === "Active" && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => cancelReservation(item._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reservations.length}</Text>
          <Text style={styles.statLabel}>Total Reservations</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reservations.filter(r => r.status === 'Active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reservations.filter(r => r.status !== 'Active').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
      
      <FlatList
        data={reservations}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
            tintColor={colors.secondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No Reservations Yet</Text>
            <Text style={styles.emptySubtitle}>Reserve books from the library to see them here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.container,
  },
  
  header: {
    backgroundColor: colors.secondary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  headerTitle: {
    ...typography.displaySmall,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    ...shadows.medium,
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statNumber: {
    ...typography.heading1,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  
  statLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  listContainer: {
    padding: spacing.md,
  },
  
  reservationCard: {
    ...components.cardElevated,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  bookIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.secondaryLight + '20',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  bookIcon: {
    fontSize: 24,
  },
  
  reservationInfo: {
    flex: 1,
  },
  
  bookTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  bookAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  bookCategory: {
    ...typography.labelMedium,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  statusBadge: {
    ...components.statusBadge,
  },
  
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  reservationDetails: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.small,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  
  detailRow: {
    ...layout.spaceBetween,
    marginBottom: spacing.xs,
  },
  
  detailLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  
  detailValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  
  cancelButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  
  cancelButtonText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
  
  loadingContainer: {
    ...layout.center,
    flex: 1,
  },
  
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  
  emptyContainer: {
    ...layout.center,
    paddingVertical: spacing.xxxl,
  },
  
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  
  emptyTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
