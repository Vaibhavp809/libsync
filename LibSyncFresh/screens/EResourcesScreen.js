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

export default function EResourcesScreen() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalResources, setTotalResources] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter state
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalResources: 0,
    featuredResources: 0,
    typeStats: []
  });

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await apiService.get('/eresources/stats/overview');
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch e-resource statistics:', error);
    }
  };

  // Fetch categories and types
  const fetchCategories = async () => {
    try {
      const data = await apiService.get('/eresources/categories');
      setAvailableTypes(data.types || []);
      setAvailableCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchResources(1, true);
    await fetchStatistics();
    setRefreshing(false);
  };

  const fetchResources = async (page = 1, isRefresh = false) => {
    if (page === 1 && !isRefresh) setLoading(true);
    if (page > 1) setLoadingMore(true);
    
    try {
      const params = { 
        page, 
        limit: 20 
      };

      if (selectedType) params.type = selectedType;
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery.trim() && isSearching) params.search = searchQuery.trim();

      const response = await apiService.get('/eresources', params);
      
      let resourcesData = [];
      let pagination = {};
      
      if (response && typeof response === 'object') {
        if (response.resources && Array.isArray(response.resources)) {
          resourcesData = response.resources;
          pagination = response.pagination || {};
        }
      }
      
      // Filter out null/invalid items
      resourcesData = resourcesData.filter((resource) => {
        return resource && typeof resource === 'object' && resource._id && resource.title;
      });
      
      if (page === 1 || isRefresh) {
        setResources(resourcesData);
      } else {
        setResources(prevResources => [...prevResources, ...resourcesData]);
      }
      
      setCurrentPage(pagination.currentPage || page);
      setHasNextPage(pagination.hasNextPage || false);
      setTotalResources(pagination.totalResources || resourcesData.length);
      
    } catch (err) {
      Alert.alert(
        'Error Loading E-Resources',
        err.message || 'Failed to load e-resources from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchResources(page, isRefresh) },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const loadMoreResources = async () => {
    if (!loadingMore && hasNextPage && !isSearching) {
      await fetchResources(currentPage + 1);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setCurrentPage(1);
      setHasNextPage(true);
      await fetchResources(1, true);
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
      if (selectedCategory) params.category = selectedCategory;

      const response = await apiService.get('/eresources', params);
      
      let resourcesData = [];
      if (response && response.resources && Array.isArray(response.resources)) {
        resourcesData = response.resources.filter(resource => 
          resource && typeof resource === 'object' && resource._id && resource.title
        );
      }
      
      setResources(resourcesData);
      setHasNextPage(false); // Disable pagination for search results
      
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search e-resources. Please try again.',
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
    await fetchResources(1, true);
  };

  const clearFilters = async () => {
    setSelectedType('');
    setSelectedCategory('');
    setShowFilters(false);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchResources(1, true);
  };

  const openResource = async (resource) => {
    try {
      // Track view/download
      await apiService.post(`/eresources/${resource._id}/download`);
      
      // Open external link
      const supported = await Linking.canOpenURL(resource.url);
      if (supported) {
        await Linking.openURL(resource.url);
      } else {
        Alert.alert('Error', 'Unable to open this resource. Please check if the URL is valid.');
      }
    } catch (error) {
      console.error('Error opening resource:', error);
      Alert.alert('Error', 'Failed to open resource. Please try again.');
    }
  };

  useEffect(() => {
    fetchResources(1);
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

  const renderResourceItem = ({ item }) => {
    if (!item || !item._id) {
      return null;
    }

    const getTypeIcon = (type) => {
      switch (type) {
        case 'e-book': return '📚';
        case 'journal': return '📄';
        case 'video': return '🎥';
        case 'database': return '🗄️';
        case 'course': return '🎓';
        case 'website': return '🌐';
        default: return '📋';
      }
    };

    const getAccessTypeColor = (accessType) => {
      switch (accessType) {
        case 'free': return colors.success;
        case 'subscription': return colors.warning;
        case 'institutional': return colors.primary;
        case 'restricted': return colors.error;
        default: return colors.textSecondary;
      }
    };

    return (
      <TouchableOpacity 
        style={styles.resourceCard} 
        onPress={() => openResource(item)}
        activeOpacity={0.8}
      >
        <View style={styles.resourceHeader}>
          <View style={styles.resourceIcon}>
            <Text style={styles.resourceEmoji}>{getTypeIcon(item.type)}</Text>
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.author && (
              <Text style={styles.resourceAuthor} numberOfLines={1}>
                by {item.author}
              </Text>
            )}
            <Text style={styles.resourceCategory}>{item.category}</Text>
          </View>
          {item.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {item.summary && (
          <Text style={styles.resourceDescription} numberOfLines={2}>
            {item.summary}
          </Text>
        )}

        <View style={styles.resourceFooter}>
          <View style={styles.resourceMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Type:</Text>
              <Text style={styles.metaValue}>
                {item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Access:</Text>
              <Text style={[styles.metaValue, { color: getAccessTypeColor(item.accessType) }]}>
                {item.accessType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
          </View>
          
          <View style={styles.resourceStats}>
            <Text style={styles.statText}>👁️ {item.viewCount}</Text>
            <Text style={styles.statText}>⬇️ {item.downloadCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && (!resources || resources.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.info} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📚 E-Resources</Text>
          <Text style={styles.headerSubtitle}>Digital learning materials</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading e-resources...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 E-Resources</Text>
        <Text style={styles.headerSubtitle}>Digital learning materials</Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources, authors, categories..."
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
              <ActivityIndicator size="small" color={colors.primary} />
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
            {isSearching ? resources.length : (statistics.totalResources || 0)}
          </Text>
          <Text style={styles.statLabel}>
            {isSearching ? 'Results' : 'Resources'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {statistics.featuredResources || 0}
          </Text>
          <Text style={styles.statLabel}>Featured</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {availableTypes.length}
          </Text>
          <Text style={styles.statLabel}>Types</Text>
        </View>
      </View>
      
      <FlatList
        data={resources}
        keyExtractor={(item, index) => item?._id || `resource-${index}`}
        renderItem={renderResourceItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMoreResources}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore && hasNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadMoreText}>Loading more resources...</Text>
            </View>
          ) : !isSearching && totalResources > 0 ? (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing {resources.length} of {totalResources} resources
              </Text>
              {!hasNextPage && (
                <Text style={styles.endOfListText}>📚 You've reached the end!</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No E-Resources Found</Text>
            <Text style={styles.emptySubtitle}>
              {isSearching ? 'Try a different search term or clear filters' : 'No resources available at the moment'}
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
              <Text style={styles.filterTitle}>Filter Resources</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Resource Type</Text>
                <View style={styles.chipContainer}>
                  {availableTypes.map(renderTypeChip)}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <View style={styles.chipContainer}>
                  {availableCategories.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => setSelectedCategory(isSelected ? '' : category)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                          {category}
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
    backgroundColor: colors.primary,
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
    color: colors.primary,
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
  
  resourceCard: {
    ...components.cardElevated,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  
  resourceIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  resourceEmoji: {
    fontSize: 24,
  },
  
  resourceInfo: {
    flex: 1,
  },
  
  resourceTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  resourceAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  resourceCategory: {
    ...typography.labelMedium,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  ratingContainer: {
    alignItems: 'center',
  },

  ratingText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },

  resourceDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  
  resourceMeta: {
    flex: 1,
  },

  metaItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },

  metaLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginRight: spacing.xs,
    minWidth: 50,
  },

  metaValue: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  resourceStats: {
    alignItems: 'flex-end',
  },

  statText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  applyFiltersText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
  },
});
