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

export default function PlacementNewsScreen() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalNews, setTotalNews] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter state
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalNews: 0,
    jobOpenings: 0,
    campusDrives: 0,
    typeStats: []
  });

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await apiService.get('/placement-news/stats/overview');
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch placement news statistics:', error);
    }
  };

  // Fetch categories and types
  const fetchCategories = async () => {
    try {
      const data = await apiService.get('/placement-news/categories');
      setAvailableTypes(data.types || []);
      setAvailablePriorities(data.priorities || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNews(1, true);
    await fetchStatistics();
    setRefreshing(false);
  };

  const fetchNews = async (page = 1, isRefresh = false) => {
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

      const response = await apiService.get('/placement-news', params);
      
      let newsData = [];
      let pagination = {};
      
      if (response && typeof response === 'object') {
        if (response.news && Array.isArray(response.news)) {
          newsData = response.news;
          pagination = response.pagination || {};
        }
      }
      
      // Filter out null/invalid items
      newsData = newsData.filter((item) => {
        return item && typeof item === 'object' && item._id && item.title;
      });
      
      if (page === 1 || isRefresh) {
        setNews(newsData);
      } else {
        setNews(prevNews => [...prevNews, ...newsData]);
      }
      
      setCurrentPage(pagination.currentPage || page);
      setHasNextPage(pagination.hasNextPage || false);
      setTotalNews(pagination.totalNews || newsData.length);
      
    } catch (err) {
      Alert.alert(
        'Error Loading Placement News',
        err.message || 'Failed to load placement news from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchNews(page, isRefresh) },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const loadMoreNews = async () => {
    if (!loadingMore && hasNextPage && !isSearching) {
      await fetchNews(currentPage + 1);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setCurrentPage(1);
      setHasNextPage(true);
      await fetchNews(1, true);
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

      const response = await apiService.get('/placement-news', params);
      
      let newsData = [];
      if (response && response.news && Array.isArray(response.news)) {
        newsData = response.news.filter(item => 
          item && typeof item === 'object' && item._id && item.title
        );
      }
      
      setNews(newsData);
      setHasNextPage(false); // Disable pagination for search results
      
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search placement news. Please try again.',
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

  // Apply filters
  const applyFilters = async () => {
    setShowFilters(false);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNews(1, true);
  };

  const clearFilters = async () => {
    setSelectedType('');
    setSelectedPriority('');
    setShowFilters(false);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchNews(1, true);
  };

  const toggleInterest = async (newsId, isCurrentlyInterested) => {
    try {
      if (isCurrentlyInterested) {
        await apiService.delete(`/placement-news/${newsId}/interest`);
      } else {
        await apiService.post(`/placement-news/${newsId}/interest`);
      }

      // Update the news item locally
      setNews(prevNews => 
        prevNews.map(item => 
          item._id === newsId 
            ? { 
                ...item, 
                isInterested: !isCurrentlyInterested,
                interestedCount: isCurrentlyInterested 
                  ? Math.max(0, (item.interestedCount || 0) - 1)
                  : (item.interestedCount || 0) + 1
              }
            : item
        )
      );
    } catch (error) {
      console.error('Error toggling interest:', error);
      Alert.alert('Error', 'Failed to update interest. Please try again.');
    }
  };

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
    fetchNews(1);
    fetchStatistics();
    fetchCategories();
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

  const renderNewsItem = ({ item }) => {
    if (!item || !item._id) {
      return null;
    }

    const getTypeIcon = (type) => {
      switch (type) {
        case 'job_opening': return '💼';
        case 'campus_drive': return '🎯';
        case 'placement_stats': return '📊';
        case 'success_story': return '🌟';
        case 'interview_tips': return '💡';
        case 'company_visit': return '🏢';
        case 'announcement': return '📢';
        default: return '📋';
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

    const isDeadlineNear = (deadline) => {
      if (!deadline) return false;
      const deadlineDate = new Date(deadline);
      const now = new Date();
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      return toLocalDateString(dateString, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return (
      <View style={styles.newsCard}>
        <View style={styles.newsHeader}>
          <View style={styles.newsIcon}>
            <Text style={styles.newsEmoji}>{getTypeIcon(item.type)}</Text>
          </View>
          <View style={styles.newsInfo}>
            <Text style={styles.newsTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.company?.name && (
              <Text style={styles.companyName} numberOfLines={1}>
                🏢 {item.company.name}
              </Text>
            )}
            <View style={styles.newsMeta}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority?.toUpperCase() || 'MEDIUM'}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(item.publishedAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.interestButton, item.isInterested && styles.interestButtonActive]}
            onPress={() => toggleInterest(item._id, item.isInterested)}
            activeOpacity={0.7}
          >
            <Text style={[styles.interestIcon, item.isInterested && styles.interestIconActive]}>
              {item.isInterested ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>

        {item.summary && (
          <Text style={styles.newsDescription} numberOfLines={3}>
            {item.summary}
          </Text>
        )}

        {/* Job details if available */}
        {item.jobDetails && (
          <View style={styles.jobDetails}>
            {item.jobDetails.position && (
              <Text style={styles.jobPosition}>📋 {item.jobDetails.position}</Text>
            )}
            {item.jobDetails.location && (
              <Text style={styles.jobLocation}>📍 {item.jobDetails.location}</Text>
            )}
            {item.jobDetails.salary && (
              <Text style={styles.jobSalary}>💰 {item.jobDetails.salary}</Text>
            )}
          </View>
        )}

        {/* Deadlines */}
        {(item.jobDetails?.applicationDeadline || item.registrationDeadline || item.eventDate) && (
          <View style={styles.deadlines}>
            {item.jobDetails?.applicationDeadline && (
              <View style={[
                styles.deadlineItem,
                isDeadlineNear(item.jobDetails.applicationDeadline) && styles.urgentDeadline
              ]}>
                <Text style={styles.deadlineLabel}>Apply by:</Text>
                <Text style={[
                  styles.deadlineDate,
                  isDeadlineNear(item.jobDetails.applicationDeadline) && styles.urgentDeadlineText
                ]}>
                  {formatDate(item.jobDetails.applicationDeadline)}
                </Text>
              </View>
            )}
            {item.registrationDeadline && (
              <View style={[
                styles.deadlineItem,
                isDeadlineNear(item.registrationDeadline) && styles.urgentDeadline
              ]}>
                <Text style={styles.deadlineLabel}>Register by:</Text>
                <Text style={[
                  styles.deadlineDate,
                  isDeadlineNear(item.registrationDeadline) && styles.urgentDeadlineText
                ]}>
                  {formatDate(item.registrationDeadline)}
                </Text>
              </View>
            )}
            {item.eventDate && (
              <View style={styles.deadlineItem}>
                <Text style={styles.deadlineLabel}>Event date:</Text>
                <Text style={styles.deadlineDate}>
                  {formatDate(item.eventDate)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.newsFooter}>
          <View style={styles.newsStats}>
            <Text style={styles.statText}>👁️ {item.viewCount || 0}</Text>
            <Text style={styles.statText}>❤️ {item.interestedCount || 0}</Text>
          </View>
          
          <View style={styles.newsActions}>
            {item.jobDetails?.applyLink && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openLink(item.jobDetails.applyLink, 'Apply')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Apply</Text>
              </TouchableOpacity>
            )}
            {item.registrationLink && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openLink(item.registrationLink, 'Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Register</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && (!news || news.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.warning} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💼 Placement News</Text>
          <Text style={styles.headerSubtitle}>Career opportunities & updates</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.warning} />
          <Text style={styles.loadingText}>Loading placement news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.warning} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💼 Placement News</Text>
        <Text style={styles.headerSubtitle}>Career opportunities & updates</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, companies, announcements..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {(searchLoading || loading) && (
            <View style={styles.searchLoader}>
              <ActivityIndicator size="small" color={colors.warning} />
            </View>
          )}
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isSearching ? news.length : (statistics.totalNews || 0)}
          </Text>
          <Text style={styles.statLabel}>
            {isSearching ? 'Results' : 'Total News'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {statistics.jobOpenings || 0}
          </Text>
          <Text style={styles.statLabel}>Job Openings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {statistics.campusDrives || 0}
          </Text>
          <Text style={styles.statLabel}>Campus Drives</Text>
        </View>
      </View>
      
      <FlatList
        data={news}
        keyExtractor={(item, index) => item?._id || `news-${index}`}
        renderItem={renderNewsItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.warning]}
            tintColor={colors.warning}
          />
        }
        onEndReached={loadMoreNews}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore && hasNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.warning} />
              <Text style={styles.loadMoreText}>Loading more news...</Text>
            </View>
          ) : !isSearching && totalNews > 0 ? (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing {news.length} of {totalNews} news items
              </Text>
              {!hasNextPage && (
                <Text style={styles.endOfListText}>💼 You've reached the end!</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💼</Text>
            <Text style={styles.emptyTitle}>No Placement News Found</Text>
            <Text style={styles.emptySubtitle}>
              {isSearching ? 'Try a different search term or clear filters' : 'No placement news available at the moment'}
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
              <Text style={styles.filterTitle}>Filter News</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>News Type</Text>
                <View style={styles.chipContainer}>
                  {availableTypes.map(renderTypeChip)}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Priority</Text>
                <View style={styles.chipContainer}>
                  {availablePriorities.map((priority) => {
                    const isSelected = selectedPriority === priority;
                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => setSelectedPriority(isSelected ? '' : priority)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                          {priority.replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
    backgroundColor: colors.warning,
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
  },
  
  searchContainer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    ...shadows.small,
  },
  
  searchLoader: {
    position: 'absolute',
    right: 60,
    top: spacing.sm + 6,
  },

  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },

  filterButtonText: {
    fontSize: 20,
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
    color: colors.warning,
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
  
  newsCard: {
    ...components.cardElevated,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  newsIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.warningLight + '20',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  newsEmoji: {
    fontSize: 24,
  },
  
  newsInfo: {
    flex: 1,
  },
  
  newsTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  companyName: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  newsMeta: {
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

  interestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },

  interestButtonActive: {
    backgroundColor: colors.errorLight + '30',
  },

  interestIcon: {
    fontSize: 20,
  },

  interestIconActive: {
    fontSize: 20,
  },

  newsDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },

  jobDetails: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.small,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },

  jobPosition: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  jobLocation: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  jobSalary: {
    ...typography.labelSmall,
    color: colors.success,
    fontWeight: '600',
  },

  deadlines: {
    backgroundColor: colors.warningLight + '20',
    borderRadius: borderRadius.small,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },

  deadlineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  urgentDeadline: {
    backgroundColor: colors.errorLight + '30',
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.xs,
  },

  deadlineLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },

  deadlineDate: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  urgentDeadlineText: {
    color: colors.error,
  },
  
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  newsStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  statText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },

  newsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  actionButton: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.small,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  actionButtonText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '600',
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

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  filterChip: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },

  filterChipSelected: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },

  filterChipText: {
    ...typography.labelMedium,
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
    backgroundColor: colors.warning,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  applyFiltersText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
});