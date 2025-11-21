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
  TextInput,
  Keyboard,
  Linking,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { colors, typography, spacing, borderRadius, shadows, components, layout } from '../styles/designSystem';
import { toLocalDateString } from '../src/utils/time';

export default function LibraryUpdatesScreen() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter state
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalUpdates: 0,
    activeUpdates: 0,
    circulars: 0,
    typeStats: []
  });
  
  // Expanded items state for update cards
  const [expandedItems, setExpandedItems] = useState({});

  // Fetch statistics from public endpoint or derive from data
  const fetchStatistics = async () => {
    try {
      // For mobile app, we'll derive statistics from the updates data
      // rather than using admin endpoints which require authentication
      const response = await apiService.getLibraryUpdates({ limit: 1 });
      setStatistics({
        totalUpdates: response.total || 0,
        activeUpdates: response.total || 0,
        circulars: 0, // Can be calculated client-side if needed
        typeStats: []
      });
    } catch (error) {
      console.error('Failed to fetch library updates statistics:', error);
      // Set default values on error
      setStatistics({
        totalUpdates: 0,
        activeUpdates: 0,
        circulars: 0,
        typeStats: []
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchUpdates(1, true);
    await fetchStatistics();
    setRefreshing(false);
  };

  const fetchUpdates = async (page = 1, isRefresh = false) => {
    if (page === 1 && !isRefresh) setLoading(true);
    if (page > 1) setLoadingMore(true);
    
    try {
      const params = { 
        page, 
        limit: 20 
      };

      if (selectedType) params.type = selectedType;
      if (selectedPriority) params.priority = selectedPriority;
      if (searchQuery.trim() && isSearching) params.search = searchQuery.trim();

      const response = await apiService.getLibraryUpdates(params);
      
      let updatesData = [];
      let pagination = {};
      
      if (response && typeof response === 'object') {
        if (response.updates && Array.isArray(response.updates)) {
          updatesData = response.updates;
          pagination = response.pagination || { hasMore: response.hasMore || false };
        } else if (Array.isArray(response)) {
          // Handle direct array response
          updatesData = response;
          pagination = { hasMore: false };
        }
      }
      
      // Filter out null/invalid items
      updatesData = updatesData.filter((item) => {
        return item && typeof item === 'object' && item._id && item.title;
      });
      
      if (page === 1 || isRefresh) {
        setUpdates(updatesData);
      } else {
        setUpdates(prevUpdates => [...prevUpdates, ...updatesData]);
      }
      
      setCurrentPage(page);
      setHasNextPage(pagination.hasMore || false);
      setTotalUpdates(response.total || updatesData.length);
      
    } catch (err) {
      Alert.alert(
        'Error Loading Library Updates',
        err.message || 'Failed to load library updates from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchUpdates(page, isRefresh) },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const loadMoreUpdates = async () => {
    if (!loadingMore && hasNextPage && !isSearching) {
      await fetchUpdates(currentPage + 1);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setCurrentPage(1);
      setHasNextPage(true);
      await fetchUpdates(1, true);
      return;
    }
    
    setSearchLoading(true);
    setIsSearching(true);
    
    try {
      const params = { 
        search: query.trim(),
        page: 1,
        limit: 20
      };

      if (selectedType) params.type = selectedType;
      if (selectedPriority) params.priority = selectedPriority;

      const response = await apiService.searchLibraryUpdates(query.trim(), params);
      
      let updatesData = [];
      if (response && response.updates && Array.isArray(response.updates)) {
        updatesData = response.updates.filter(item => 
          item && typeof item === 'object' && item._id && item.title
        );
      }
      
      setUpdates(updatesData);
      setHasNextPage(false); // Disable pagination for search results
      
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search library updates. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const openLink = async (url, title) => {
    if (!url) {
      Alert.alert('No Link', 'No link available for this item.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Unable to open link for ${title}. Please check if the URL is valid.`);
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link. Please try again.');
    }
  };

  useEffect(() => {
    fetchUpdates(1);
    fetchStatistics();
  }, []);

  const renderTypeChip = (type) => {
    const isSelected = selectedType === type;
    return (
      <TouchableOpacity
        key={type}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => setSelectedType(isSelected ? '' : type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderUpdateItem = ({ item, index }) => {
    if (!item || !item._id) {
      return null;
    }

    const getTypeIcon = (type) => {
      switch (type) {
        case 'placement_alert': return '🚨';
        case 'circular': return '📋';
        case 'e_resource': return '📚';
        case 'announcement': return '📢';
        case 'job_opening': return '💼';
        case 'event': return '🎆';
        default: return '📰';
      }
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
      return toLocalDateString(dateString, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const expanded = expandedItems[item._id] || false;
    const toggleExpanded = () => {
      setExpandedItems(prev => ({
        ...prev,
        [item._id]: !expanded
      }));
    };

    return (
      <TouchableOpacity 
        style={styles.updateCard}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.updateHeader}>
          <View style={styles.updateIcon}>
            <Text style={styles.updateEmoji}>{getTypeIcon(item.type)}</Text>
          </View>
          <View style={styles.updateInfo}>
            <Text style={styles.updateTitle} numberOfLines={expanded ? 0 : 2}>
              {item.title}
              {item.isPinned && <Text style={styles.pinnedIcon}>📌</Text>}
            </Text>
            <View style={styles.updateMeta}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority?.toUpperCase() || 'MEDIUM'}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(item.createdAt)}
              </Text>
              <Text style={styles.viewCount}>
                👁️ {item.viewCount || 0}
              </Text>
            </View>
          </View>
        </View>

        {(expanded || (!expanded && item.description?.length <= 100)) && (
          <Text style={styles.updateDescription} numberOfLines={expanded ? 0 : 3}>
            {item.description}
          </Text>
        )}

        {!expanded && item.description?.length > 100 && (
          <Text style={styles.readMore}>Tap to read more...</Text>
        )}

        {/* Show link if available */}
        {item.link && expanded && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openLink(item.link, item.title)}
            activeOpacity={0.7}
          >
            <Text style={styles.linkButtonText}>🔗 Read Full Article</Text>
          </TouchableOpacity>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && expanded && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, tagIndex) => (
              <Text key={tagIndex} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search library updates..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searchLoading && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
        )}
      </View>

      {/* Quick Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {['placement_alert', 'circular', 'e_resource', 'announcement', 'job_opening', 'event'].map(renderTypeChip)}
      </ScrollView>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.totalUpdates}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.activeUpdates}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.circulars}</Text>
          <Text style={styles.statLabel}>Circulars</Text>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading more updates...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Library Updates</Text>
      <Text style={styles.emptyDescription}>
        {isSearching 
          ? `No updates found matching "${searchQuery}"`
          : "There are no library updates available at the moment."
        }
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchUpdates(1, true)}>
        <Text style={styles.retryButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading library updates...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <FlatList
        data={updates}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderUpdateItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        onEndReached={loadMoreUpdates}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={updates.length === 0 ? styles.emptyListContainer : styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
  },
  searchLoader: {
    marginLeft: spacing.sm,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: 0,
  },
  filterChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: colors.surface,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.heading2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  updateCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  updateHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  updateIcon: {
    marginRight: spacing.md,
  },
  updateEmoji: {
    fontSize: 24,
  },
  updateInfo: {
    flex: 1,
  },
  updateTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pinnedIcon: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  updateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priorityText: {
    ...typography.labelSmall,
    fontWeight: 'bold',
    marginRight: spacing.md,
  },
  dateText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  viewCount: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  updateDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  readMore: {
    ...typography.labelSmall,
    color: colors.primary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  linkButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  linkButtonText: {
    ...typography.bodyMedium,
    color: colors.surface,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tag: {
    ...typography.labelSmall,
    color: colors.primary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodyMedium,
    color: colors.surface,
    fontWeight: '600',
  },
});