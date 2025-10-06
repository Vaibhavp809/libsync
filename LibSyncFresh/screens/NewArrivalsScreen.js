import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, StatusBar, RefreshControl, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '../config/apiConfig';
import { mockApi } from '../config/mockApiConfig';
import { colors, typography, spacing, borderRadius, shadows, components, layout, getStatusColor, getStatusBackgroundColor } from '../styles/designSystem';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - (spacing.md * 3)) / 2;

export default function NewArrivalsScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const enableMockMode = async () => {
    try {
      await AsyncStorage.setItem('api_mode', 'mock');
      console.log('✅ Mock mode enabled');
      Alert.alert(
        'Mock Mode Enabled', 
        'App will now use demo data.',
        [{ text: 'OK', onPress: fetchNewBooks }]
      );
    } catch (error) {
      console.error('Failed to enable mock mode:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNewBooks();
    setRefreshing(false);
  };

  const fetchNewBooks = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const apiMode = await AsyncStorage.getItem('api_mode');
      
      if (apiMode === 'mock') {
        // Use mock new arrivals data
        const mockNewBooks = [
          {
            _id: 'new1',
            title: 'React Native in Action',
            author: 'Nader Dabit',
            category: 'Mobile Development',
            status: 'Available',
            addedOn: new Date().toISOString()
          },
          {
            _id: 'new2',
            title: 'Learning TypeScript',
            author: 'Josh Goldberg',
            category: 'Programming',
            status: 'Available',
            addedOn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
          },
          {
            _id: 'new3',
            title: 'Modern JavaScript for Web Developers',
            author: 'Alex Banks',
            category: 'Web Development',
            status: 'Available',
            addedOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
          }
        ];
        setBooks(mockNewBooks);
      } else {
        // Try real API first, fallback to mock on failure
        try {
          const endpoint = await apiConfig.getEndpoint('/books/new');
          const response = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch new arrivals');
          }
          
          const data = await response.json();
          setBooks(data);
        } catch (apiError) {
          console.warn('Real API failed, falling back to mock data:', apiError.message);
          // Automatically enable mock mode
          await AsyncStorage.setItem('api_mode', 'mock');
          const mockNewBooks = [
            {
              _id: 'new1',
              title: 'React Native in Action',
              author: 'Nader Dabit',
              category: 'Mobile Development',
              status: 'Available',
              addedOn: new Date().toISOString()
            }
          ];
          setBooks(mockNewBooks);
        }
      }
    } catch (err) {
      console.error('Error fetching new arrivals:', err);
      Alert.alert(
        'Error Loading New Arrivals', 
        `${err.message || 'Failed to load new arrivals'}\n\nWould you like to enable demo mode?`,
        [
          { text: 'Enable Demo Mode', onPress: enableMockMode },
          { text: 'Retry', onPress: fetchNewBooks },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewBooks();
  }, []);

  const renderFeaturedItem = ({ item, index }) => {
    const addedDate = new Date(item.addedOn);
    const isNew = (new Date() - addedDate) / (1000 * 60 * 60 * 24) <= 3; // New if added within 3 days
    
    return (
      <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9}>
        <View style={styles.featuredCardContent}>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          
          <View style={styles.featuredBookIcon}>
            <Text style={styles.featuredBookEmoji}>🎆</Text>
          </View>
          
          <Text style={styles.featuredTitle}>{item.title}</Text>
          <Text style={styles.featuredAuthor}>by {item.author}</Text>
          
          <View style={styles.featuredDetails}>
            <Text style={styles.featuredCategory}>{item.category}</Text>
            <Text style={styles.featuredDate}>
              Added {addedDate.toLocaleDateString()}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderGridItem = ({ item }) => {
    const addedDate = new Date(item.addedOn);
    const isNew = (new Date() - addedDate) / (1000 * 60 * 60 * 24) <= 3;
    
    return (
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.9}>
        {isNew && (
          <View style={styles.gridNewBadge}>
            <Text style={styles.gridNewBadgeText}>✨</Text>
          </View>
        )}
        
        <View style={styles.gridBookIcon}>
          <Text style={styles.gridBookEmoji}>📖</Text>
        </View>
        
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>by {item.author}</Text>
        <Text style={styles.gridCategory}>{item.category}</Text>
        
        <View style={[styles.gridStatusBadge, { backgroundColor: getStatusBackgroundColor(item.status) }]}>
          <Text style={[styles.gridStatusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'Available' ? 'AVAILABLE' : item.status?.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎆 New Arrivals</Text>
          <Text style={styles.headerSubtitle}>Discover the latest additions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading new arrivals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const recentBooks = books.filter(book => {
    const daysSinceAdded = (new Date() - new Date(book.addedOn)) / (1000 * 60 * 60 * 24);
    return daysSinceAdded <= 7; // Books added in the last 7 days
  });
  
  const todayBooks = books.filter(book => {
    const addedDate = new Date(book.addedOn).toDateString();
    const today = new Date().toDateString();
    return addedDate === today;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.secondary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎆 New Arrivals</Text>
        <Text style={styles.headerSubtitle}>Discover the latest additions</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{books.length}</Text>
          <Text style={styles.statLabel}>Total New</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{todayBooks.length}</Text>
          <Text style={styles.statLabel}>Added Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{recentBooks.length}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>
      
      <FlatList
        data={books}
        keyExtractor={item => item._id}
        renderItem={renderGridItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
        ListHeaderComponent={
          books.length > 0 ? (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>✨ Featured New Arrivals</Text>
              <FlatList
                data={books.slice(0, 3)}
                keyExtractor={item => `featured-${item._id}`}
                renderItem={renderFeaturedItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              />
              <Text style={styles.sectionTitle}>📚 All New Books</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎆</Text>
            <Text style={styles.emptyTitle}>No New Arrivals</Text>
            <Text style={styles.emptySubtitle}>Check back soon for the latest additions to our library</Text>
          </View>
        }
      />
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
  
  featuredSection: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  
  featuredList: {
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    marginBottom: spacing.xl,
  },
  
  featuredCard: {
    width: cardWidth * 1.2,
    marginRight: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    ...shadows.large,
    overflow: 'hidden',
  },
  
  featuredCardContent: {
    padding: spacing.md,
    alignItems: 'center',
  },
  
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 1,
  },
  
  newBadgeText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
  },
  
  featuredBookIcon: {
    width: 80,
    height: 80,
    backgroundColor: colors.secondaryLight + '20',
    borderRadius: borderRadius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  
  featuredBookEmoji: {
    fontSize: 40,
  },
  
  featuredTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  
  featuredAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  
  featuredDetails: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  featuredCategory: {
    ...typography.labelMedium,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  
  featuredDate: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  
  listContainer: {
    padding: spacing.md,
  },
  
  row: {
    justifyContent: 'space-between',
  },
  
  gridCard: {
    width: cardWidth,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  
  gridNewBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.secondaryLight,
    borderRadius: borderRadius.round,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  
  gridNewBadgeText: {
    fontSize: 12,
  },
  
  gridBookIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.secondaryLight + '20',
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  
  gridBookEmoji: {
    fontSize: 30,
  },
  
  gridTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    minHeight: 48, // Ensure consistent height
  },
  
  gridAuthor: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  
  gridCategory: {
    ...typography.labelSmall,
    color: colors.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
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
  
  gridStatusBadge: {
    ...components.statusBadge,
    paddingHorizontal: spacing.sm,
  },
  
  gridStatusText: {
    ...typography.labelSmall,
    fontWeight: '600',
    fontSize: 10,
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
