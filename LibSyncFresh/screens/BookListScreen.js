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
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { colors, typography, spacing, borderRadius, shadows, components, layout, getStatusColor, getStatusBackgroundColor } from '../styles/designSystem';

export default function BookListScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [user, setUser] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalBooks, setTotalBooks] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalBooks: 0,
    availableBooks: 0,
    issuedBooks: 0
  });


  // Fetch statistics for dashboard
  const fetchStatistics = async () => {
    try {
      const stats = await apiService.getBookStatistics();
      setStatistics({
        totalBooks: stats.totalBooks || 0,
        availableBooks: stats.availableBooks || 0,
        issuedBooks: stats.issuedBooks || 0
      });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasNextPage(true);
    await fetchBooks(1, true);
    await fetchStatistics();
    setRefreshing(false);
  };

  const fetchBooks = async (page = 1, isRefresh = false) => {
    if (page === 1 && !isRefresh) setLoading(true);
    if (page > 1) setLoadingMore(true);
    
    try {
      const response = await apiService.getBooks({ 
        page, 
        limit: 20,
        sortBy: 'accessionNumber',
        sortOrder: 'asc'
      });
      
      let booksData = [];
      let pagination = {};
      
      // Handle both old array response and new paginated response
      if (response && typeof response === 'object') {
        if (response.books && Array.isArray(response.books)) {
          // New paginated response
          booksData = response.books;
          pagination = response.pagination || {};
        } else if (Array.isArray(response)) {
          // Old array response
          booksData = response;
        }
      }
      
      // Filter out null/invalid items and log any issues
      const originalCount = booksData.length;
      booksData = booksData.filter((book, index) => {
        const isValid = book && typeof book === 'object' && book._id && book.title;
        if (!isValid) {
          console.warn(`Invalid book at index ${index}:`, book);
        }
        return isValid;
      });
      
      console.log(`Filtered books: ${originalCount} -> ${booksData.length}`);
      
      if (page === 1 || isRefresh) {
        console.log('Setting books (page 1 or refresh):', booksData.length);
        setBooks(booksData);
      } else {
        // Append to existing books for pagination
        console.log('Appending books for pagination:', booksData.length);
        setBooks(prevBooks => {
          const newBooks = [...prevBooks, ...booksData];
          console.log(`Total books after append: ${newBooks.length}`);
          return newBooks;
        });
      }
      
      // Update pagination state
      setCurrentPage(pagination.currentPage || page);
      setHasNextPage(pagination.hasNextPage || false);
      setTotalBooks(pagination.totalBooks || booksData.length);
      
    } catch (err) {
      Alert.alert(
        'Error Loading Books',
        err.message || 'Failed to load books from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchBooks(page, isRefresh) },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Load more books when reaching end of list
  const loadMoreBooks = async () => {
    if (!loadingMore && hasNextPage && !isSearching) {
      await fetchBooks(currentPage + 1);
    }
  };

  const reserveBook = async (bookId) => {
    if (!studentId) {
      Alert.alert('Error', 'Please log in to reserve books');
      return;
    }

    try {
      const data = await apiService.createReservation(studentId, bookId);
      
      Alert.alert('Success', 'Book reserved successfully!', [
        { text: 'OK', onPress: () => fetchBooks() }
      ]);
    } catch (err) {
      if (err.message.includes('Session expired') || err.message.includes('not authenticated')) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to reserve books.',
          [
            { text: 'OK', onPress: () => {
              // Navigate back to login or handle re-authentication
            }}
          ]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to reserve book');
      }
    }
  };

  // Search functionality
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // If search query is empty, reset to paginated view
      setIsSearching(false);
      setCurrentPage(1);
      setHasNextPage(true);
      await fetchBooks(1, true);
      return;
    }
    
    setSearchLoading(true);
    setIsSearching(true);
    
    try {
      const data = await apiService.searchBooks(query);
      // Handle both array response and paginated response
      let booksData = [];
      if (Array.isArray(data)) {
        booksData = data;
      } else if (data && data.books && Array.isArray(data.books)) {
        booksData = data.books;
      }
      
      // Filter out null/invalid items
      booksData = booksData.filter(book => {
        return book && typeof book === 'object' && book._id && book.title;
      });
      
      setBooks(booksData);
      setHasNextPage(false); // Disable pagination for search results
      
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search books. Please try again.',
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

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        // Try new format first, fallback to legacy
        let userData = await AsyncStorage.getItem('user_data');
        if (!userData) {
          userData = await AsyncStorage.getItem('userData');
        }
        
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setStudentId(parsedUser._id || parsedUser.id);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadStudentData();
    fetchBooks(1);
    fetchStatistics();
  }, []);

  const renderItem = ({ item }) => {
    // Add null check and validation
    if (!item || !item._id) {
      console.warn('Invalid book item:', item);
      return null;
    }

    return (
      <View style={styles.bookCard}>
        <View style={styles.bookHeader}>
          <View style={styles.bookIcon}>
            <Text style={styles.bookEmoji}>📚</Text>
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{item.title || 'Untitled Book'}</Text>
            <Text style={styles.bookAuthor}>by {item.author || 'Unknown Author'}</Text>
            <Text style={styles.bookISBN}>Acc. No: {item.accessionNumber || 'N/A'}</Text>
            <Text style={styles.bookCategory}>{item.category || 'Uncategorized'}</Text>
          </View>
        </View>
        
        <View style={styles.bookFooter}>
          <View style={styles.availabilityContainer}>
            <Text style={styles.availabilityLabel}>Availability:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.status || item.availability || 'Available') }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status || item.availability || 'Available') }]}>
                {(item.status || item.availability || 'Available').toUpperCase()}
              </Text>
            </View>
          </View>
          
          {(item.status === "Available" || item.availability === "Available" || !item.status) && (
            <TouchableOpacity 
              style={styles.reserveButton}
              onPress={() => reserveBook(item._id)}
              activeOpacity={0.8}
            >
              <Text style={styles.reserveButtonText}>Reserve Book</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Early return for loading state - prevents null access issues
  if (loading && (!books || books.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📚 Library Books</Text>
          <Text style={styles.headerSubtitle}>Discover your next great read</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Library Books</Text>
        <Text style={styles.headerSubtitle}>Discover your next great read</Text>
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, author, or ISBN..."
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
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{isSearching ? books.length : (statistics.totalBooks || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>{isSearching ? 'Search Results' : 'Total Books'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isSearching 
              ? books.filter(b => b && (b.status === 'Available' || b.availability === 'Available')).length 
              : (statistics.availableBooks || 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isSearching 
              ? books.filter(b => b && (b.status !== 'Available' && b.availability !== 'Available')).length 
              : (statistics.issuedBooks || 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>{isSearching ? 'Not Available' : 'Issued'}</Text>
        </View>
      </View>
      
      <FlatList
        data={Array.isArray(books) ? books.filter(book => book && book._id) : []}
        keyExtractor={(item, index) => {
          // Safe keyExtractor with fallback
          return item?._id || `book-${index}`;
        }}
        renderItem={renderItem}
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
        onEndReached={loadMoreBooks}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore && hasNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadMoreText}>Loading more books...</Text>
            </View>
          ) : !isSearching && totalBooks > 0 ? (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing {books.length} of {totalBooks.toLocaleString()} books
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
            <Text style={styles.emptyTitle}>No Books Found</Text>
            <Text style={styles.emptySubtitle}>{isSearching ? 'Try a different search term' : 'Try refreshing or check your connection'}</Text>
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
    ...components.header,
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
    position: 'relative',
  },
  
  searchInput: {
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
    right: spacing.md,
    top: spacing.sm + 6,
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
  
  bookCard: {
    ...components.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  
  bookHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  
  bookIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  bookEmoji: {
    fontSize: 24,
  },
  
  bookInfo: {
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
  
  bookISBN: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  
  bookCategory: {
    ...typography.labelMedium,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  bookFooter: {
    ...layout.spaceBetween,
    alignItems: 'flex-end',
  },
  
  availabilityContainer: {
    alignItems: 'flex-start',
  },
  
  availabilityLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  
  reserveButton: {
    ...components.buttonPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  
  reserveButtonText: {
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
});
