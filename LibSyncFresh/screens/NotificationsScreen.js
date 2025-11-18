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
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when fetching
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [user, setUser] = useState(null);
  
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
  
  // Expanded/collapsed state for notifications
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [readMoreNotifications, setReadMoreNotifications] = useState(new Set());
  
  // Cleared notifications (stored locally to persist across refreshes)
  const [clearedNotificationIds, setClearedNotificationIds] = useState(new Set());

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

  const loadClearedNotifications = async () => {
    try {
      const clearedIds = await AsyncStorage.getItem('cleared_notifications');
      if (clearedIds) {
        const idsArray = JSON.parse(clearedIds);
        setClearedNotificationIds(new Set(idsArray));
      }
    } catch (error) {
      console.error('Failed to load cleared notifications:', error);
    }
  };

  const saveClearedNotification = async (notificationId) => {
    try {
      const newClearedIds = new Set(clearedNotificationIds);
      newClearedIds.add(notificationId);
      setClearedNotificationIds(newClearedIds);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('cleared_notifications', JSON.stringify(Array.from(newClearedIds)));
    } catch (error) {
      console.error('Failed to save cleared notification:', error);
    }
  };

  const clearAllClearedNotifications = async () => {
    try {
      setClearedNotificationIds(new Set());
      await AsyncStorage.removeItem('cleared_notifications');
    } catch (error) {
      console.error('Failed to clear all cleared notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setUnreadCount(0);
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
    // Prevent multiple simultaneous calls
    if (loading && page === 1 && !isRefresh) {
      console.log('Already loading, skipping duplicate call');
      return;
    }
    if (loadingMore && page > 1) {
      console.log('Already loading more, skipping duplicate call');
      return;
    }
    
    if (page === 1 && !isRefresh) {
      setLoading(true);
      console.log('Setting loading to true');
    }
    if (page > 1) setLoadingMore(true);
    
    try {
      const params = { 
        page, 
        limit: 20 
      };

      if (selectedType && selectedType !== 'all') params.type = selectedType;
      if (showUnreadOnly) params.unreadOnly = 'true';

      if (!user?._id) {
        console.warn('No user found, cannot fetch notifications');
        // Clear loading state even if no user
        setLoading(false);
        setLoadingMore(false);
        setNotifications([]);
        return;
      }
      
      console.log('Fetching notifications for user:', user._id);
      const response = await apiService.getNotifications(user._id);
      console.log('Notification response received:', JSON.stringify(response, null, 2));
      
      let notificationsData = [];
      let pagination = {};
      
      // Handle different response formats
      if (response) {
        // Check if response is an array (direct array response)
        if (Array.isArray(response)) {
          notificationsData = response;
          console.log('Response is direct array, notifications:', notificationsData.length);
        }
        // Check if response has notifications property
        else if (response.notifications && Array.isArray(response.notifications)) {
          notificationsData = response.notifications;
          pagination = response.pagination || {};
          console.log('Parsed notifications:', notificationsData.length, 'pagination:', pagination);
        }
        // Check if response has data property (some APIs wrap in data)
        else if (response.data && Array.isArray(response.data)) {
          notificationsData = response.data;
          pagination = response.pagination || {};
          console.log('Parsed notifications from data:', notificationsData.length);
        }
        // If response is an object but no notifications array, log it
        else if (typeof response === 'object') {
          console.warn('Unexpected response format - no notifications array:', Object.keys(response));
          // Try to extract any array from the response
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray(response[key])) {
              console.log(`Found array in key '${key}':`, response[key].length);
              notificationsData = response[key];
              break;
            }
          }
        } else {
          console.warn('Invalid response type:', typeof response, response);
        }
      } else {
        console.warn('Empty or null response');
      }
      
      console.log('Final notificationsData length:', notificationsData.length);
      
      // Filter out null/invalid items
      notificationsData = notificationsData.filter((notification) => {
        return notification && typeof notification === 'object' && notification._id && notification.title;
      });
      
      console.log('After filtering invalid items:', notificationsData.length);
      
      // Filter out cleared notifications
      notificationsData = notificationsData.filter((notification) => {
        const id = notification._id?.toString() || notification._id;
        return !clearedNotificationIds.has(id);
      });
      
      console.log('After filtering cleared notifications:', notificationsData.length);
      
      // Deduplicate notifications by _id to prevent duplicates (safety net)
      const seenIds = new Set();
      notificationsData = notificationsData.filter((notification) => {
        const id = notification._id?.toString() || notification._id;
        if (seenIds.has(id)) {
          console.warn('Duplicate notification detected:', id);
          return false; // Duplicate, skip it
        }
        seenIds.add(id);
        return true;
      });
      
      console.log('After deduplication:', notificationsData.length);
      
      // Always update state, even if empty array
      if (page === 1 || isRefresh) {
        // Replace all notifications on refresh or first page
        console.log('Setting notifications (replace):', notificationsData.length);
        setNotifications(notificationsData);
      } else {
        // Also deduplicate when appending to prevent duplicates from pagination
        setNotifications(prevNotifications => {
          const existingIds = new Set(prevNotifications.map(n => {
            const id = n._id?.toString() || n._id;
            return id;
          }));
          const newNotifications = notificationsData.filter(n => {
            const id = n._id?.toString() || n._id;
            return !existingIds.has(id);
          });
          const result = [...prevNotifications, ...newNotifications];
          console.log('Setting notifications (append):', result.length);
          return result;
        });
      }
      
      setCurrentPage(pagination.currentPage || page);
      setHasNextPage(pagination.hasNextPage || false);
      setTotalNotifications(pagination.totalNotifications || notificationsData.length);
      
      console.log('State updated successfully');
      
    } catch (err) {
      console.error('Error fetching notifications:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      
      // Set empty array on error to clear loading state
      if (page === 1 || isRefresh) {
        setNotifications([]);
      }
      
      // Don't show alert if it's just an empty response
      if (err.message && !err.message.includes('404') && !err.message.includes('No notifications')) {
        Alert.alert(
          'Error Loading Notifications',
          err.message || 'Failed to load notifications from server. Please check your connection and try again.',
          [
            { text: 'Retry', onPress: () => fetchNotifications(page, isRefresh) },
            { text: 'Cancel', onPress: () => {
              // Ensure loading is cleared even if user cancels
              setLoading(false);
              setLoadingMore(false);
            }}
          ]
        );
      }
    } finally {
      // Always clear loading state, no matter what happens
      console.log('Clearing loading state');
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
      await apiService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true, readAt: new Date() }
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

  const clearNotification = async (notificationId) => {
    try {
      // Mark as read first
      await markAsRead(notificationId);
      
      // Save to cleared notifications list
      await saveClearedNotification(notificationId);
      
      // Remove from local state (delete from user's view)
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification._id !== notificationId)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error clearing notification:', error);
      Alert.alert('Error', 'Failed to clear notification.');
    }
  };

  const toggleExpand = (notificationId) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const toggleReadMore = (notificationId) => {
    setReadMoreNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const shouldShowReadMore = (message) => {
    return message && message.length > 150;
  };

  const parseOverdueNotification = (item) => {
    // Extract information from message or use data fields
    const message = item.message || '';
    const title = item.title || '';
    
    // Try to extract book title from title (format: "Book Overdue: {title}")
    let bookTitle = '';
    if (title.includes('Book Overdue:')) {
      bookTitle = title.replace('Book Overdue:', '').trim();
    } else if (item.data?.bookId?.title) {
      bookTitle = item.data.bookId.title;
    } else {
      // Try to extract from message
      const match = message.match(/"([^"]+)"/);
      if (match) bookTitle = match[1];
    }
    
    // Extract accession number
    let accessionNumber = '';
    const accMatch = message.match(/Accession No\.:\s*(\S+)/i);
    if (accMatch) {
      accessionNumber = accMatch[1];
    }
    
    // Extract days overdue
    let daysOverdue = 0;
    const daysMatch = message.match(/(\d+)\s*day/i);
    if (daysMatch) {
      daysOverdue = parseInt(daysMatch[1]);
    }
    
    // Extract fine amount
    let fine = 0;
    const fineMatch = message.match(/₹(\d+)/);
    if (fineMatch) {
      fine = parseInt(fineMatch[1]);
    }
    
    // Get due date from data
    const dueDate = item.data?.dueDate ? new Date(item.data.dueDate) : null;
    
    return {
      bookTitle,
      accessionNumber,
      daysOverdue,
      fine,
      dueDate
    };
  };

  const formatFormattedDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const markAllAsRead = async () => {
    try {
      if (!user?._id) return;
      
      await apiService.markAllNotificationsAsRead(user._id);
      
      // Update all notifications as read
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true,
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
    loadUserData();
    loadClearedNotifications();
  }, []);

  useEffect(() => {
    if (user?._id) {
      console.log('User loaded, fetching notifications');
      fetchNotifications(1);
      fetchUnreadCount();
    } else {
      // If no user, clear loading state
      console.log('No user, clearing loading state');
      setLoading(false);
      setNotifications([]);
    }
  }, [user]);

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

  const renderRightActions = (notificationId) => {
    return (
      <View style={styles.rightActionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            Alert.alert(
              'Clear Notification',
              'This will remove the notification from your view. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => clearNotification(notificationId)
                }
              ]
            );
          }}
        >
          <Text style={styles.deleteActionText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOverdueNotification = (item, overdueData) => {
    const isUnread = !item.read;
    const isExpanded = expandedNotifications.has(item._id);

    return (
      <View style={styles.overdueCard}>
        <View style={styles.overdueHeader}>
          <Text style={styles.overdueTitle}>📚 {overdueData.bookTitle || 'Book Overdue'}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.overdueDetails}>
          {overdueData.accessionNumber && (
            <View style={styles.overdueDetailRow}>
              <Text style={styles.overdueLabel}>Accession Number:</Text>
              <Text style={styles.overdueValue}>{overdueData.accessionNumber}</Text>
            </View>
          )}
          
          {overdueData.daysOverdue > 0 && (
            <View style={styles.overdueDetailRow}>
              <Text style={styles.overdueLabel}>Days Overdue:</Text>
              <Text style={[styles.overdueValue, styles.overdueWarning]}>
                {overdueData.daysOverdue} day{overdueData.daysOverdue > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          {overdueData.dueDate && (
            <View style={styles.overdueDetailRow}>
              <Text style={styles.overdueLabel}>Due Date:</Text>
              <Text style={styles.overdueValue}>
                {formatFormattedDate(overdueData.dueDate)}
              </Text>
            </View>
          )}
          
          {overdueData.fine > 0 && (
            <View style={styles.overdueDetailRow}>
              <Text style={styles.overdueLabel}>Current Fine:</Text>
              <Text style={[styles.overdueValue, styles.overdueFine]}>
                ₹{overdueData.fine}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.overdueFooter}>
          <Text style={styles.overdueMessage}>
            Please return this book as soon as possible to avoid additional fines.
          </Text>
        </View>
      </View>
    );
  };

  const renderNotificationItem = ({ item }) => {
    if (!item || !item._id) {
      return null;
    }

    const isUnread = !item.read;
    const isExpanded = expandedNotifications.has(item._id);
    const showReadMore = shouldShowReadMore(item.message);
    const isReadMoreExpanded = readMoreNotifications.has(item._id);
    const messagePreview = showReadMore && !isReadMoreExpanded 
      ? item.message.substring(0, 150) + '...' 
      : item.message;
    
    // Check if this is an overdue notification
    const isOverdueNotification = item.type === 'due_date' && item.title?.includes('Overdue');
    const overdueData = isOverdueNotification ? parseOverdueNotification(item) : null;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item._id)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            isUnread && styles.unreadNotification,
            isOverdueNotification && styles.overdueNotificationCard
          ]}
          onPress={() => !item.read && markAsRead(item._id)}
          activeOpacity={0.8}
        >
          {isOverdueNotification && overdueData ? (
            // Render formatted overdue notification
            renderOverdueNotification(item, overdueData)
          ) : (
            // Render regular notification
            <>
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
                  
                  <Text style={styles.notificationMessage}>
                    {messagePreview}
                  </Text>
                  
                  {showReadMore && (
                    <TouchableOpacity
                      onPress={() => toggleReadMore(item._id)}
                      style={styles.readMoreButton}
                    >
                      <Text style={styles.readMoreText}>
                        {isReadMoreExpanded ? 'Read Less' : 'Read More'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
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
            </>
          )}

          {/* Collapsible section - only show for non-overdue or when expanded */}
          {(!isOverdueNotification || isExpanded) && (
            <View style={styles.collapsibleSection}>
              {isOverdueNotification ? (
                // For overdue notifications, show clear button in expanded section
                isExpanded && (
                  <View style={styles.expandedContent}>
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => {
                        Alert.alert(
                          'Clear Notification',
                          'This will remove the notification from your view. Continue?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Clear',
                              style: 'destructive',
                              onPress: () => clearNotification(item._id)
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.clearButtonText}>🗑️ Clear Notification</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                // For regular notifications, show collapsible section
                <>
                  <TouchableOpacity
                    onPress={() => toggleExpand(item._id)}
                    style={styles.collapseHeader}
                  >
                    <Text style={styles.collapseButtonText}>
                      {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
                    </Text>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.expandedContent}>
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
                      
                      {/* Clear button */}
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => {
                          Alert.alert(
                            'Clear Notification',
                            'This will remove the notification from your view. Continue?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Clear',
                                style: 'destructive',
                                onPress: () => clearNotification(item._id)
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.clearButtonText}>🗑️ Clear Notification</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
          
          {/* Show expand/collapse button for overdue notifications */}
          {isOverdueNotification && (
            <TouchableOpacity
              onPress={() => toggleExpand(item._id)}
              style={styles.collapseHeader}
            >
              <Text style={styles.collapseButtonText}>
                {isExpanded ? '▼ Hide Options' : '▶ Show Options'}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Swipeable>
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

  // Add timeout to prevent infinite loading
  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading timeout - clearing loading state');
        setLoading(false);
        setLoadingMore(false);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Show loading only if we're actually loading and have no notifications yet
  // Don't block the screen if we have notifications or if refreshing
  if (loading && (!notifications || notifications.length === 0) && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterButtonText}>🔍 Filter</Text>
        </TouchableOpacity>
        
        <View style={styles.headerRightActions}>
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllButtonText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={() => {
                Alert.alert(
                  'Clear All Notifications',
                  `This will clear all ${notifications.length} notifications from your view. Continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: async () => {
                        // Mark all current notifications as cleared
                        const currentIds = notifications.map(n => n._id?.toString() || n._id).filter(Boolean);
                        if (currentIds.length > 0) {
                          const newClearedIds = new Set(clearedNotificationIds);
                          currentIds.forEach(id => newClearedIds.add(id));
                          setClearedNotificationIds(newClearedIds);
                          await AsyncStorage.setItem('cleared_notifications', JSON.stringify(Array.from(newClearedIds)));
                        }
                        
                        // Clear all notifications from view
                        setNotifications([]);
                        setUnreadCount(0);
                        // Optionally mark all as read
                        try {
                          if (user?._id) {
                            await apiService.markAllNotificationsAsRead(user._id);
                          }
                        } catch (error) {
                          console.error('Error marking all as read:', error);
                        }
                      }
                    }
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllButtonText}>🗑️ Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.error }]}>
            {unreadCount}
          </Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {notifications.filter(n => n.read).length}
          </Text>
          <Text style={styles.statLabel}>Read</Text>
        </View>
      </View>
      
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item?._id ? `${item._id}-${index}` : `notification-${index}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.container,
  },

  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  filterButton: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterButtonText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  markAllButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  markAllButtonText: {
    ...typography.labelMedium,
    color: colors.white,
    fontWeight: '600',
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

  // Swipe actions
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },

  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: borderRadius.medium,
    marginLeft: spacing.sm,
  },

  deleteActionText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },

  // Read more/less
  readMoreButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  readMoreText: {
    ...typography.labelSmall,
    color: colors.secondary,
    fontWeight: '600',
  },

  // Collapsible section
  collapsibleSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: spacing.sm,
  },

  collapseHeader: {
    paddingVertical: spacing.xs,
  },

  collapseButtonText: {
    ...typography.labelSmall,
    color: colors.secondary,
    fontWeight: '600',
  },

  expandedContent: {
    marginTop: spacing.sm,
  },

  // Clear button
  clearButton: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.medium,
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },

  clearButtonText: {
    ...typography.labelMedium,
    color: colors.error,
    fontWeight: '600',
  },

  // Header actions
  headerRightActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  clearAllButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  clearAllButtonText: {
    ...typography.labelMedium,
    color: colors.white,
    fontWeight: '600',
  },

  // Overdue notification styles
  overdueNotificationCard: {
    borderLeftColor: colors.error,
    borderLeftWidth: 4,
  },

  overdueCard: {
    padding: spacing.sm,
  },

  overdueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  overdueTitle: {
    ...typography.heading2,
    color: colors.error,
    fontWeight: '700',
    flex: 1,
  },

  overdueDetails: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  overdueDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },

  overdueDetailRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },

  overdueLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },

  overdueValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  overdueWarning: {
    color: colors.error,
    fontWeight: '700',
  },

  overdueFine: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 16,
  },

  overdueFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },

  overdueMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});