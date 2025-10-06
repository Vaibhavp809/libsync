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
  const [allBooks, setAllBooks] = useState([]); // Store all books for filtering
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [user, setUser] = useState(null);


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBooks();
    setRefreshing(false);
  };

  const fetchBooks = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await apiService.getBooks();
      
      if (Array.isArray(data)) {
        setBooks(data);
        setAllBooks(data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      Alert.alert(
        'Error Loading Books',
        err.message || 'Failed to load books from server. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchBooks() },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setLoading(false);
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
      // If search query is empty, show all books
      setBooks(allBooks);
      return;
    }
    
    setSearchLoading(true);
    try {
      const data = await apiService.searchBooks(query);
      if (Array.isArray(data)) {
        setBooks(data);
      } else {
        throw new Error('Invalid search results format');
      }
    } catch (error) {
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search books. Please try again.',
        [{ text: 'OK' }]
      );
      // Reset to show all books on search error
      setBooks(allBooks);
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
  }, [searchQuery, allBooks]);

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
    fetchBooks();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookHeader}>
        <View style={styles.bookIcon}>
          <Text style={styles.bookEmoji}>📚</Text>
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{item.title}</Text>
          <Text style={styles.bookAuthor}>by {item.author}</Text>
          <Text style={styles.bookISBN}>ISBN: {item.isbn || 'N/A'}</Text>
          <Text style={styles.bookCategory}>{item.category}</Text>
        </View>
      </View>
      
      <View style={styles.bookFooter}>
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityLabel}>Availability:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.status || item.availability) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status || item.availability) }]}>
              {(item.status || item.availability)?.toUpperCase()}
            </Text>
          </View>
        </View>
        
        {(item.status === "Available" || item.availability === "Available") && (
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

  if (loading) {
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
          <Text style={styles.statNumber}>{books.length}</Text>
          <Text style={styles.statLabel}>Total Books</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{books.filter(b => (b.status === 'Available' || b.availability === 'Available')).length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{books.filter(b => (b.status === 'Reserved' || b.availability === 'Reserved' || b.status === 'Borrowed' || b.availability === 'Borrowed')).length}</Text>
          <Text style={styles.statLabel}>Not Available</Text>
        </View>
      </View>
      
      <FlatList
        data={books}
        keyExtractor={item => item._id}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No Books Found</Text>
            <Text style={styles.emptySubtitle}>Try refreshing or check your connection</Text>
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
});
