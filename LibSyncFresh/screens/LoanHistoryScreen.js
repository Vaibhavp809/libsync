import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, StatusBar, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { colors, typography, spacing, borderRadius, shadows, components, layout, getStatusColor, getStatusBackgroundColor } from '../styles/designSystem';

export default function LoanHistoryScreen() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState('');


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  };

  const fetchLoans = async (isRefresh = false) => {
    if (!studentId) {
      return;
    }
    
    if (!isRefresh) setLoading(true);
    try {
      const data = await apiService.getLoans(studentId);
      
      if (Array.isArray(data)) {
        // Sort loans by issueDate in descending order (newest first)
        const sortedLoans = [...data].sort((a, b) => {
          const dateA = new Date(a.issueDate || a.createdAt || 0);
          const dateB = new Date(b.issueDate || b.createdAt || 0);
          return dateB - dateA; // Descending order (newest first)
        });
        setLoans(sortedLoans);
      } else {
        throw new Error('Invalid loans data format');
      }
    } catch (err) {
      Alert.alert(
        'Error Loading Loan History',
        err.message || 'Failed to load loan history from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchLoans() },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
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
          const id = user._id || user.id;
          setStudentId(id);
        } else {
          Alert.alert('Error', 'Please log in to view loan history');
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    loadStudentData();
  }, []);
  
  useEffect(() => {
    if (studentId) {
      fetchLoans();
    }
  }, [studentId]);

  const renderItem = ({ item, index }) => {
    const issueDate = new Date(item.issueDate);
    const dueDate = new Date(item.dueDate);
    const returnDate = item.returnDate ? new Date(item.returnDate) : null;
    const isOverdue = !returnDate && new Date() > dueDate;
    
    // Determine the proper status display
    let actualStatus = item.status;
    if (isOverdue) {
      actualStatus = 'overdue';
    } else if (item.status === 'Active' || (!returnDate && !isOverdue)) {
      actualStatus = 'issued';
    } else if (returnDate || item.status === 'Returned') {
      actualStatus = 'returned';
    }
    
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineConnector}>
          <View style={[styles.timelineDot, { backgroundColor: getStatusColor(actualStatus) }]} />
          {index < loans.length - 1 && <View style={styles.timelineLine} />}
        </View>
        
        <View style={styles.loanCard}>
          <View style={styles.cardHeader}>
            <View style={styles.bookIconContainer}>
              <Text style={styles.bookIcon}>📕</Text>
            </View>
            <View style={styles.loanInfo}>
              <Text style={styles.bookTitle}>{item.book.title}</Text>
              <Text style={styles.bookAuthor}>by {item.book.author}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(actualStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(actualStatus) }]}>
                {actualStatus.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.loanDetails}>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>📅 Issued</Text>
                <Text style={styles.dateValue}>{issueDate.toLocaleDateString()}</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>⏰ Due Date</Text>
                <Text style={[styles.dateValue, isOverdue && styles.overdueText]}>
                  {dueDate.toLocaleDateString()}
                </Text>
              </View>
              {returnDate && (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>✅ Returned</Text>
                  <Text style={styles.dateValue}>{returnDate.toLocaleDateString()}</Text>
                </View>
              )}
            </View>
            
            {isOverdue && (
              <View style={styles.overdueWarning}>
                <Text style={styles.overdueWarningText}>
                  ⚠️ This book is overdue! Please return it as soon as possible.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.success} />
          <Text style={styles.loadingText}>Loading loan history...</Text>
        </View>
      </View>
    );
  }

  const activeLoans = loans.filter(loan => loan.status === 'Active' || (!loan.returnDate && new Date() > new Date(loan.dueDate)));
  const completedLoans = loans.filter(loan => loan.status === 'Returned' || loan.returnDate);
  const overdueLoans = loans.filter(loan => !loan.returnDate && new Date() > new Date(loan.dueDate));

  return (
    <View style={styles.container}>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{loans.length}</Text>
          <Text style={styles.statLabel}>Total Loans</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeLoans.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, overdueLoans.length > 0 && { color: colors.error }]}>
            {overdueLoans.length}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>
      
      <FlatList
        data={loans}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.success]}
            tintColor={colors.success}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No Loan History</Text>
            <Text style={styles.emptySubtitle}>Your borrowed books will appear here</Text>
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
    backgroundColor: colors.success,
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
    color: colors.success,
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
  
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  
  timelineConnector: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 24,
  },
  
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.md,
  },
  
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginTop: spacing.sm,
  },
  
  loanCard: {
    ...components.card,
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  bookIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: colors.successLight + '20',
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  bookIcon: {
    fontSize: 20,
  },
  
  loanInfo: {
    flex: 1,
  },
  
  bookTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  bookAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
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
  
  loanDetails: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.small,
    padding: spacing.md,
  },
  
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  dateLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  
  dateValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  overdueText: {
    color: colors.error,
  },
  
  overdueWarning: {
    backgroundColor: colors.errorLight + '20',
    borderRadius: borderRadius.small,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  
  overdueWarningText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
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
