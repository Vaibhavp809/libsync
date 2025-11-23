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
  
  // Advanced search/filter state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedEdition, setSelectedEdition] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [editionInput, setEditionInput] = useState('');
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showEditionDropdown, setShowEditionDropdown] = useState(false);
  const [availableTitles, setAvailableTitles] = useState([]);
  const [availableEditions, setAvailableEditions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  
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

  // Search functionality - now only triggers on submit or search button
  const [searchInputValue, setSearchInputValue] = useState('');
  
  // Fetch available titles and editions for filters
  const fetchBookFilters = async () => {
    setFiltersLoading(true);
    try {
      const filters = await apiService.getBookFilters();
      setAvailableTitles(filters.titles || []);
      setAvailableEditions(filters.editions || []);
    } catch (error) {
      console.error('Failed to fetch book filters:', error);
    } finally {
      setFiltersLoading(false);
    }
  };
  
  const handleSearchSubmit = async (query = searchInputValue) => {
    setSearchQuery(query);
    
    // Build search params
    const searchParams = {};
    if (query.trim()) {
      searchParams.q = query.trim();
    }
    if (selectedTitle) {
      searchParams.title = selectedTitle;
    }
    if (selectedEdition) {
      searchParams.edition = selectedEdition;
    }
    
    // If no search query and no filters, reset to paginated view
    if (!query.trim() && !selectedTitle && !selectedEdition) {
      setIsSearching(false);
      setCurrentPage(1);
      setHasNextPage(true);
      await fetchBooks(1, true);
      return;
    }
    
    setSearchLoading(true);
    setIsSearching(true);
    
    try {
      let booksData = [];
      
      // If we have filters but no query, use getBooks with filters
      if (!query.trim() && (selectedTitle || selectedEdition)) {
        const params = {
          page: 1,
          limit: 100,
          ...(selectedTitle && { search: selectedTitle }),
          ...(selectedEdition && { search: selectedEdition })
        };
        const response = await apiService.getBooks(params);
        booksData = response.books || [];
      } else if (query.trim()) {
        // Use searchBooks endpoint
        const data = await apiService.searchBooks(query);
        // Handle both array response and paginated response
        if (Array.isArray(data)) {
          booksData = data;
        } else if (data && data.books && Array.isArray(data.books)) {
          booksData = data.books;
        }
      }
      
      // Apply additional filters if needed
      if (selectedTitle || selectedEdition) {
        booksData = booksData.filter(book => {
          if (selectedTitle && book.title !== selectedTitle) return false;
          if (selectedEdition && book.edition !== selectedEdition) return false;
          return true;
        });
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
  
  const handleClearFilters = () => {
    setSelectedTitle('');
    setSelectedEdition('');
    setTitleInput('');
    setEditionInput('');
    setSearchInputValue('');
    setSearchQuery('');
    setIsSearching(false);
    setCurrentPage(1);
    setHasNextPage(true);
    fetchBooks(1, true);
  };
  
  const handleSearchInputChange = (value) => {
    setSearchInputValue(value);
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
    fetchBookFilters();
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
            <Text style={styles.bookISBN}>
              Acc. No: {item.accessionNumber || 'N/A'}
              {item.edition && ` • Edition: ${item.edition}`}
              {item.copiesAvailable !== undefined && (
                <Text style={styles.copiesAvailable}>
                  {' • '}({item.copiesAvailable} copies available)
                </Text>
              )}
            </Text>
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Search Bar */}
      <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Title, Author, or Accession No..."
                placeholderTextColor={colors.textSecondary}
                value={searchInputValue}
                onChangeText={handleSearchInputChange}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchSubmit()}
                selectionColor={colors.primary}
              />
              {searchInputValue.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchInputValue('');
                    handleSearchSubmit('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => handleSearchSubmit()}
              activeOpacity={0.8}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          
          {/* Advanced Search Toggle */}
          <TouchableOpacity
            style={styles.advancedSearchToggle}
            onPress={() => {
              setShowAdvancedSearch(!showAdvancedSearch);
              if (!showAdvancedSearch) {
                fetchBookFilters();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.advancedSearchToggleText}>
              {showAdvancedSearch ? '▼' : '▶'} Advanced Search / Filter
            </Text>
          </TouchableOpacity>
          
          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <View style={styles.advancedSearchPanel}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Title:</Text>
                <View style={styles.filterSelectContainer}>
                  <TextInput
                    style={styles.filterSelect}
                    placeholder="Select or type title..."
                    placeholderTextColor={colors.textSecondary}
                    value={titleInput}
                    onChangeText={(text) => {
                      setTitleInput(text);
                      setShowTitleDropdown(text.length > 0);
                      if (text.length === 0) {
                        setSelectedTitle('');
                      }
                    }}
                    onFocus={() => setShowTitleDropdown(titleInput.length > 0)}
                    onBlur={() => setTimeout(() => setShowTitleDropdown(false), 200)}
                  />
                  {showTitleDropdown && availableTitles.length > 0 && (
                    <View style={styles.filterDropdown}>
                      <FlatList
                        data={availableTitles
                          .filter(title => title.toLowerCase().includes(titleInput.toLowerCase()))
                          .slice(0, 5)}
                        keyExtractor={(item, index) => `title-${index}`}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.filterDropdownItem}
                            onPress={() => {
                              setSelectedTitle(item);
                              setTitleInput(item);
                              setShowTitleDropdown(false);
                            }}
                          >
                            <Text style={styles.filterDropdownText}>{item}</Text>
                          </TouchableOpacity>
                        )}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Edition:</Text>
                <View style={styles.filterSelectContainer}>
                  <TextInput
                    style={styles.filterSelect}
                    placeholder="Select or type edition..."
                    placeholderTextColor={colors.textSecondary}
                    value={editionInput}
                    onChangeText={(text) => {
                      setEditionInput(text);
                      setShowEditionDropdown(text.length > 0);
                      if (text.length === 0) {
                        setSelectedEdition('');
                      }
                    }}
                    onFocus={() => setShowEditionDropdown(editionInput.length > 0)}
                    onBlur={() => setTimeout(() => setShowEditionDropdown(false), 200)}
                  />
                  {showEditionDropdown && availableEditions.length > 0 && (
                    <View style={styles.filterDropdown}>
                      <FlatList
                        data={availableEditions
                          .filter(edition => edition.toLowerCase().includes(editionInput.toLowerCase()))
                          .slice(0, 5)}
                        keyExtractor={(item, index) => `edition-${index}`}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.filterDropdownItem}
                            onPress={() => {
                              setSelectedEdition(item);
                              setEditionInput(item);
                              setShowEditionDropdown(false);
                            }}
                          >
                            <Text style={styles.filterDropdownText}>{item}</Text>
                          </TouchableOpacity>
                        )}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.filterApplyButton}
                  onPress={() => handleSearchSubmit()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterClearButton}
                  onPress={handleClearFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filterClearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {(searchLoading || loading) && (
            <View style={styles.searchLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchLoadingText}>
                {searchLoading ? 'Searching...' : 'Loading...'}
              </Text>
            </View>
          )}
          {isSearching && !searchLoading && (
            <Text style={styles.searchResultsText}>
              {books.length > 0 
                ? `Found ${books.length} result${books.length === 1 ? '' : 's'}${searchQuery ? ` for "${searchQuery}"` : ''}${selectedTitle ? ` (Title: ${selectedTitle})` : ''}${selectedEdition ? ` (Edition: ${selectedEdition})` : ''}`
                : `No results found${searchQuery ? ` for "${searchQuery}"` : ''}`
              }
            </Text>
          )}
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
            <Text style={styles.emptyTitle}>{isSearching ? 'No Books Found' : 'No Books Available'}</Text>
            <Text style={styles.emptySubtitle}>
              {isSearching 
                ? `No books match "${searchQuery}".\nTry searching by:\n• Book title\n• Author name\n• 6-digit accession number`
                : 'Try refreshing or check your connection'
              }
            </Text>
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.lg,
    ...shadows.medium,
    borderWidth: 2,
    borderColor: colors.gray200,
    minHeight: 48,
  },
  
  searchIcon: {
    fontSize: 20,
    color: colors.primary,
    marginRight: spacing.md,
  },
  
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    fontWeight: '500',
  },
  
  clearButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray100,
  },
  
  clearButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
    elevation: 2,
  },
  
  searchButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  searchLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  searchLoadingText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  
  searchResultsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
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
  
  copiesAvailable: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
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
  
  advancedSearchToggle: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  
  advancedSearchToggleText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  
  advancedSearchPanel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  filterRow: {
    marginBottom: spacing.md,
  },
  
  filterLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  
  filterSelectContainer: {
    position: 'relative',
  },
  
  filterSelect: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 150,
    zIndex: 1000,
    ...shadows.medium,
  },
  
  filterDropdownItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  filterDropdownText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  
  filterActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  
  filterApplyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  filterApplyButtonText: {
    ...typography.buttonMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  
  filterClearButton: {
    flex: 1,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  
  filterClearButtonText: {
    ...typography.buttonMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
