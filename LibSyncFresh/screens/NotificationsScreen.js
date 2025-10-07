import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);
  
  // Filter state
  const [selectedType, setSelectedType] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Unread count
  const [unreadCount, setUnreadCount] = useState(0);

  // Available notification types
  const notificationTypes = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'reservation', label: 'Reservations', icon: '📚' },
    { key: 'due_date', label: 'Due Dates', icon: '⏰' },
    { key: 'announcement', label: 'Announcements', icon: '📢' },
    { key: 'placement', label: 'Placements', icon: '💼' },
    { key: 'urgent', label: 'Urgent', icon: '🚨' },
    { key: 'general', label: 'General', icon: '💡' }
  ];

  const fetchUnreadCount = async () => {
    try {
      const response = await apiService.get('/notifications/unread-count');
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNotifications(1, true);
    await fetchUnreadCount();
    setRefreshing(false);
  };

  const fetchNotifications = async (page = 1, isRefresh = false) => {
    if (page === 1 && !isRefresh) setLoading(true);
    if (page > 1) setLoadingMore(true);
    
    try {
      const params = { 
        page, 
        limit: 20 
      };

      if (selectedType && selectedType !== 'all') params.type = selectedType;
      if (showUnreadOnly) params.unreadOnly = 'true';

      const response = await apiService.get('/notifications/my-notifications', params);
      
      let notificationsData = [];
      let pagination = {};
      
      if (response && typeof response === 'object') {
        if (response.notifications && Array.isArray(response.notifications)) {
          notificationsData = response.notifications;
          pagination = response.pagination || {};
        }
      }
      
      // Filter out null/invalid items
      notificationsData = notificationsData.filter((notification) => {
        return notification && typeof notification === 'object' && notification._id && notification.title;
      });
      
      if (page === 1 || isRefresh) {
        setNotifications(notificationsData);
      } else {
        setNotifications(prevNotifications => [...prevNotifications, ...notificationsData]);
      }
      
      setCurrentPage(pagination.currentPage || page);
      setHasNextPage(pagination.hasNextPage || false);
      setTotalNotifications(pagination.totalNotifications || notificationsData.length);
      
    } catch (err) {
      Alert.alert(
        'Error Loading Notifications',
        err.message || 'Failed to load notifications from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchNotifications(page, isRefresh) },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const loadMoreNotifications = async () => {
    if (!loadingMore && hasNextPage) {
      await fetchNotifications(currentPage + 1);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiService.put(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.put('/notifications/mark-all-read');
      
      // Update all notifications as read
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date()
        }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      Alert.alert('Success', 'All notifications marked as read.');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
    }
  };

  // Apply filters
  const applyFilters = async () => {
    setShowFilters(false);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNotifications(1, true);
  };

  const clearFilters = async () => {
    setSelectedType('');
    setShowUnreadOnly(false);
    setShowFilters(false);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNotifications(1, true);
  };

  useEffect(() => {
    fetchNotifications(1);
    fetchUnreadCount();
  }, []);

  const getTypeIcon = (type) => {
    const typeObj = notificationTypes.find(t => t.key === type);
    return typeObj ? typeObj.icon : '📋';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.info;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderNotificationItem = ({ item }) => {
    if (!item || !item._id) {
      return null;
    }

    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.unreadNotification
        ]}
        onPress={() => !item.isRead && markAsRead(item._id)}
        activeOpacity={0.8}
      >
        <View style={styles.notificationHeader}>
          <View style={[
            styles.notificationIcon,
            { backgroundColor: getPriorityColor(item.priority) + '20' }
          ]}>
            <Text style={styles.notificationEmoji}>
              {getTypeIcon(item.type)}
            </Text>
          </View>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <Text style={[
                styles.notificationTitle,
                isUnread && styles.unreadTitle
              ]} numberOfLines={2}>
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={3}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority) }
              ]}>
                {item.priority?.toUpperCase() || 'MEDIUM'}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional data display */}
        {item.data && (
          <View style={styles.notificationData}>
            {item.data.bookId && (
              <Text style={styles.dataText}>
                📚 Book: {item.data.bookId.title || 'Unknown'}
              </Text>
            )}
            {item.data.link && (
              <Text style={styles.linkText} numberOfLines={1}>
                🔗 {item.data.link}
              </Text>
            )}
            {item.data.expiryDate && (
              <Text style={styles.expiryText}>
                ⏰ Expires: {formatDate(item.data.expiryDate)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTypeChip = (type) => {
    const isSelected = selectedType === type.key;
    return (
      <TouchableOpacity
        key={type.key}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => setSelectedType(isSelected ? '' : type.key)}
        activeOpacity={0.7}
      >
        <Text style={styles.chipEmoji}>{type.icon}</Text>
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {type.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && (!notifications || notifications.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔔 Notifications</Text>
          <Text style={styles.headerSubtitle}>Stay updated with latest alerts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔔 Notifications</Text>
        <Text style={styles.headerSubtitle}>Stay updated with latest alerts</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterButtonText}>🔍 Filter</Text>
          </TouchableOpacity>
          
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllButtonText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {totalNotifications || notifications.length}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.error }]}>
            {unreadCount}
          </Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {notifications.filter(n => n.isRead).length}
          </Text>
          <Text style={styles.statLabel}>Read</Text>
        </View>
      </View>
      
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item?._id || `notification-${index}`}
        renderItem={renderNotificationItem}
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
        onEndReached={loadMoreNotifications}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore && hasNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.secondary} />
              <Text style={styles.loadMoreText}>Loading more notifications...</Text>
            </View>
          ) : totalNotifications > 0 ? (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing {notifications.length} of {totalNotifications} notifications
              </Text>
              {!hasNextPage && (
                <Text style={styles.endOfListText}>🔔 You're all caught up!</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              {showUnreadOnly ? 'All notifications have been read' : 'You have no notifications at the moment'}
            </Text>
          </View>
        }
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Notifications</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Show Only</Text>
                <TouchableOpacity
                  style={[styles.toggleOption, showUnreadOnly && styles.toggleOptionActive]}
                  onPress={() => setShowUnreadOnly(!showUnreadOnly)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleText, showUnreadOnly && styles.toggleTextActive]}>
                    📬 Unread Notifications Only
                  </Text>
                  <View style={[styles.toggle, showUnreadOnly && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, showUnreadOnly && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Notification Type</Text>
                <View style={styles.chipContainer}>
                  {notificationTypes.map(renderTypeChip)}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={applyFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.container,
  },
  
  header: {
    backgroundColor: colors.secondary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.lg,
  },

  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },

  filterButtonText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  markAllButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },

  markAllButtonText: {
    ...typography.labelMedium,
    color: colors.secondary,
    fontWeight: '600',
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: -spacing.md,
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
  
  notificationCard: {
    ...components.cardElevated,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },

  unreadNotification: {
    backgroundColor: colors.secondaryLight + '10',
    borderLeftColor: colors.error,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  notificationEmoji: {
    fontSize: 24,
  },
  
  notificationInfo: {
    flex: 1,
  },

  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  
  notificationTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },

  unreadTitle: {
    fontWeight: '700',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginTop: spacing.xs,
  },

  notificationMessage: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },

  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priorityText: {
    ...typography.labelSmall,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  dateText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },

  notificationData: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.small,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },

  dataText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  linkText: {
    ...typography.labelSmall,
    color: colors.info,
    marginBottom: spacing.xs,
  },

  expiryText: {
    ...typography.labelSmall,
    color: colors.warning,
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
  
  loadMoreContainer: {
    ...layout.center,
    paddingVertical: spacing.lg,
  },
  
  loadMoreText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  
  paginationInfo: {
    ...layout.center,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  
  paginationText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  endOfListText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Filter modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  filterModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xlarge,
    borderTopRightRadius: borderRadius.xlarge,
    maxHeight: '80%',
  },

  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },

  filterTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    ...typography.heading3,
    color: colors.textSecondary,
  },

  filterContent: {
    maxHeight: 400,
  },

  filterSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },

  filterSectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
  },

  toggleOptionActive: {
    backgroundColor: colors.secondaryLight + '20',
  },

  toggleText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },

  toggleTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },

  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  toggleActive: {
    backgroundColor: colors.secondary,
  },

  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: spacing.xs,
  },

  filterChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },

  chipEmoji: {
    fontSize: 16,
  },

  filterChipText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },

  filterChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  filterActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },

  clearFiltersButton: {
    flex: 1,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  clearFiltersText: {
    ...typography.buttonMedium,
    color: colors.textSecondary,
  },

  applyFiltersButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  applyFiltersText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
});