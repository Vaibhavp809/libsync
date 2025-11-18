import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function StockVerification() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('unverified'); // Default to unverified
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [resetConfirm, setResetConfirm] = useState(null); // { book: {...}, show: true }
  const [bulkResetConfirm, setBulkResetConfirm] = useState(false);
  const [resetAllConfirm, setResetAllConfirm] = useState(false);
  const [resetAllCount, setResetAllCount] = useState(0);
  const [loadingResetAllCount, setLoadingResetAllCount] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  
  // Statistics state (separate from paginated books)
  const [statistics, setStatistics] = useState({
    totalBooks: 0,
    verifiedBooks: 0,
    unverifiedBooks: 0,
    verificationPercentage: 0
  });

  // Fetch paginated books
  const fetchBooks = async (page = 1, limit = itemsPerPage, search = searchTerm, status = filterStatus) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page: page,
        limit: limit,
        sortBy: 'accessionNumber',
        sortOrder: 'asc'
      };
      
      if (search.trim()) {
        params.search = search;
      }
      
      // Handle verification status filter - use server-side filtering
      if (status && status !== 'all') {
        params.verificationFilter = status;
      }
      
      // Remove empty parameters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const queryString = new URLSearchParams(params).toString();
      const res = await api.get(`/books?${queryString}`);
      
      console.log('Paginated API Response:', res);
      
      if (!res.data) {
        console.error('No data received from books API');
        setBooks([]);
        return;
      }
      
      // Handle the paginated response structure
      const responseData = res.data;
      let booksData = [];
      
      if (responseData.books && Array.isArray(responseData.books)) {
        booksData = responseData.books;
      } else if (Array.isArray(responseData)) {
        booksData = responseData; // Fallback for old API
      }
      
      console.log(`Loaded ${booksData.length} books for stock verification (page ${page})`);
      setBooks(booksData);
      
      // Update pagination info
      if (responseData.pagination) {
        setCurrentPage(responseData.pagination.currentPage);
        setTotalPages(responseData.pagination.totalPages);
        setTotalBooks(responseData.pagination.totalBooks);
        setHasNextPage(responseData.pagination.hasNextPage);
        setHasPrevPage(responseData.pagination.hasPrevPage);
      }
      
    } catch (err) {
      console.error('Failed to load books:', err);
      alert('Failed to load books. Please try refreshing the page.');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch statistics separately for better performance
  const fetchStatistics = async () => {
    try {
      const res = await api.get('/books/statistics');
      if (res.data) {
        const totalBooks = res.data.totalBooks || 0;
        const verifiedBooks = res.data.verifiedBooks || 0; // We need to add this to backend
        const unverifiedBooks = totalBooks - verifiedBooks;
        
        setStatistics({
          totalBooks,
          verifiedBooks,
          unverifiedBooks,
          verificationPercentage: totalBooks > 0 ? Math.round((verifiedBooks / totalBooks) * 100) : 0
        });
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
      // Don't show error to user for statistics as it's not critical
    }
  };

  // Show notification toast
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleVerifyBook = async (bookId) => {
    try {
      setVerifying(bookId);
      await api.put(`/books/${bookId}/verify`);
      showNotification('Book marked as verified!', 'success');
      // Refresh current page and statistics
      await fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus);
      await fetchStatistics();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to verify book', 'error');
    } finally {
      setVerifying(null);
    }
  };

  // Reset verification for a single book
  const handleResetVerification = async (bookId) => {
    try {
      setResetting(bookId);
      await api.put(`/books/${bookId}/reset-verification`);
      showNotification('Book reset to unverified', 'success');
      setResetConfirm(null);
      // Clear selection if this book was selected
      setSelectedBooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
      // Refresh current page and statistics
      await fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus);
      await fetchStatistics();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reset book', 'error');
    } finally {
      setResetting(null);
    }
  };

  // Bulk reset verification
  const handleBulkResetVerification = async () => {
    if (selectedBooks.size === 0) {
      showNotification('Please select at least one book', 'error');
      return;
    }

    try {
      setResetting('bulk');
      const ids = Array.from(selectedBooks);
      await api.put('/books/bulk-reset', { ids });
      showNotification(`Reset ${ids.length} book(s) to unverified`, 'success');
      setBulkResetConfirm(false);
      setSelectedBooks(new Set());
      // Refresh current page and statistics
      await fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus);
      await fetchStatistics();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reset books', 'error');
    } finally {
      setResetting(null);
    }
  };

  // Toggle book selection
  const toggleBookSelection = (bookId) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedBooks.size === filteredBooks.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(filteredBooks.map(book => book._id)));
    }
  };

  // Fetch count of books that would be affected by reset-all
  const fetchResetAllCount = async () => {
    try {
      setLoadingResetAllCount(true);
      const res = await api.get('/books/count-to-reset');
      if (res.data && res.data.count !== undefined) {
        const count = res.data.count;
        setResetAllCount(count);
        return count; // Return count for immediate use
      }
      return 0;
    } catch (err) {
      console.error('Failed to fetch reset-all count:', err);
      setResetAllCount(0);
      return 0;
    } finally {
      setLoadingResetAllCount(false);
    }
  };

  // Reset all books to unverified
  const handleResetAllVerification = async () => {
    try {
      setResetting('all');
      const res = await api.put('/books/reset-all');
      showNotification(`All books reset to Unverified — ${res.data.updatedCount} books updated`, 'success');
      setResetAllConfirm(false);
      setResetAllCount(0);
      // Refresh current page and statistics
      await fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus);
      await fetchStatistics();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reset all books', 'error');
    } finally {
      setResetting(null);
    }
  };

  // Open reset-all confirmation modal
  const handleResetAllClick = async () => {
    const count = await fetchResetAllCount();
    if (count > 0) {
      setResetAllConfirm(true);
    } else {
      showNotification('No books to reset', 'success');
    }
  };
  
  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchBooks(page, itemsPerPage, searchTerm, filterStatus);
  };
  
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    fetchBooks(1, newLimit, searchTerm, filterStatus);
  };
  
  // Search handler - only updates input value, doesn't trigger search
  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    // Don't trigger search automatically - wait for Enter key
  };
  
  // Handle Enter key press to trigger search
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentSearchValue = e.target.value;
      setSearchTerm(currentSearchValue); // Ensure state is in sync
      setCurrentPage(1);
      fetchBooks(1, itemsPerPage, currentSearchValue, filterStatus);
    }
  };
  
  const handleStatusFilterChange = (newStatus) => {
    setFilterStatus(newStatus);
    setCurrentPage(1);
    fetchBooks(1, itemsPerPage, searchTerm, newStatus);
  };

  useEffect(() => {
    fetchBooks(1, itemsPerPage, '', 'unverified'); // Default to unverified
    fetchStatistics();
  }, []);

  // Books are now pre-filtered by the API and pagination
  const booksArray = Array.isArray(books) ? books : [];
  const filteredBooks = booksArray; // No need for additional filtering since it's done server-side
  
  // Use statistics from the separate API call
  const verifiedCount = statistics.verifiedBooks;
  const unverifiedCount = statistics.unverifiedBooks;

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading inventory...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Notification Toast */}
      {notification.show && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {notification.message}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirm && resetConfirm.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Reset Verification</h3>
            <p style={styles.modalText}>
              Reset <strong>{resetConfirm.book.accessionNumber}</strong> - <strong>{resetConfirm.book.title}</strong> to Unverified?
            </p>
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={() => setResetConfirm(null)}
                disabled={resetting === resetConfirm.book._id}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonConfirm }}
                onClick={() => handleResetVerification(resetConfirm.book._id)}
                disabled={resetting === resetConfirm.book._id}
              >
                {resetting === resetConfirm.book._id ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reset Confirmation Modal */}
      {bulkResetConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Bulk Reset Verification</h3>
            <p style={styles.modalText}>
              Reset {selectedBooks.size} selected book(s) to Unverified?
            </p>
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={() => setBulkResetConfirm(false)}
                disabled={resetting === 'bulk'}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonConfirm }}
                onClick={handleBulkResetVerification}
                disabled={resetting === 'bulk'}
              >
                {resetting === 'bulk' ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Confirmation Modal */}
      {resetAllConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Reset All to Unverified</h3>
            <p style={styles.modalText}>
              <strong>Confirm: Reset ALL verified/damaged/lost books to Unverified?</strong>
            </p>
            <p style={styles.modalText}>
              This will affect <strong>{resetAllCount}</strong> book(s). This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonCancel }}
                onClick={() => setResetAllConfirm(false)}
                disabled={resetting === 'all'}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.modalButton, ...styles.modalButtonDanger }}
                onClick={handleResetAllVerification}
                disabled={resetting === 'all'}
              >
                {resetting === 'all' ? 'Processing, please wait...' : 'Confirm Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stock Verification</h1>
          <p style={styles.subtitle}>
            Review and verify the physical inventory of books in your library
          </p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.refreshButton} onClick={() => fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus)}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📚</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{statistics.totalBooks.toLocaleString()}</h3>
            <p style={styles.statLabel}>Total Books</p>
          </div>
          <div style={styles.statTrend}>
            <span style={styles.trendText}>Complete inventory</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{statistics.verifiedBooks.toLocaleString()}</h3>
            <p style={styles.statLabel}>Verified</p>
          </div>
          <div style={styles.statTrend}>
            <span style={styles.trendText}>
              {statistics.verificationPercentage}%
            </span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{statistics.unverifiedBooks.toLocaleString()}</h3>
            <p style={styles.statLabel}>Pending Verification</p>
          </div>
          <div style={styles.statTrend}>
            <span style={styles.trendText}>Requires attention</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{filteredBooks.length}</h3>
            <p style={styles.statLabel}>Filtered Results</p>
          </div>
          <div style={styles.statTrend}>
            <span style={styles.trendText}>Current view</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controls}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search books by title, author, or accession number... (Press Enter to search)"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            style={styles.searchInput}
          />
          <span style={styles.searchIcon}>🔍</span>
        </div>
        <div style={styles.filterContainer}>
          <select
            value={filterStatus}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Books</option>
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        {/* Reset All button */}
        <div style={styles.resetAllContainer}>
          <button
            style={styles.resetAllButton}
            onClick={handleResetAllClick}
            disabled={resetting === 'all' || loadingResetAllCount}
          >
            {loadingResetAllCount ? 'Loading...' : 'Reset All → Unverified'}
          </button>
        </div>
        {/* Bulk actions */}
        {selectedBooks.size > 0 && (
          <div style={styles.bulkActions}>
            <span style={styles.bulkActionsText}>{selectedBooks.size} selected</span>
            <button
              style={styles.bulkResetButton}
              onClick={() => setBulkResetConfirm(true)}
              disabled={resetting === 'bulk'}
            >
              Reset Selected to Unverified
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={styles.progressTitle}>Verification Progress</h3>
          <span style={styles.progressText}>
            {statistics.verifiedBooks.toLocaleString()} of {statistics.totalBooks.toLocaleString()} books verified
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${statistics.verificationPercentage}%`
            }}
          />
        </div>
      </div>

      {/* Book Inventory */}
      <div style={styles.section}>
        <div style={styles.inventoryHeader}>
          <h3 style={styles.sectionTitle}>
            📚 Book Inventory
          </h3>
          <div style={styles.inventoryInfo}>
            Showing {filteredBooks.length} books on page {currentPage} of {totalPages} • Total: {totalBooks.toLocaleString()} books
            {filteredBooks.length > 0 && (
              <button
                style={styles.selectAllButton}
                onClick={toggleSelectAll}
              >
                {selectedBooks.size === filteredBooks.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>
        
        {/* Pagination Controls - Top */}
        {totalPages > 1 && (
          <div style={styles.paginationContainer}>
            <div style={styles.paginationInfo}>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                style={styles.itemsPerPageSelect}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            <div style={styles.paginationControls}>
              <button
                onClick={() => handlePageChange(1)}
                disabled={!hasPrevPage}
                style={{
                  ...styles.paginationButton,
                  opacity: !hasPrevPage ? 0.5 : 1,
                  cursor: !hasPrevPage ? 'not-allowed' : 'pointer'
                }}
              >
                First
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevPage}
                style={{
                  ...styles.paginationButton,
                  opacity: !hasPrevPage ? 0.5 : 1,
                  cursor: !hasPrevPage ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              <div style={styles.pageNumbers}>
                {(() => {
                  const pages = [];
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, currentPage + 2);
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        style={{
                          ...styles.paginationButton,
                          ...(i === currentPage ? styles.activePage : {})
                        }}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()} 
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
                style={{
                  ...styles.paginationButton,
                  opacity: !hasNextPage ? 0.5 : 1,
                  cursor: !hasNextPage ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={!hasNextPage}
                style={{
                  ...styles.paginationButton,
                  opacity: !hasNextPage ? 0.5 : 1,
                  cursor: !hasNextPage ? 'not-allowed' : 'pointer'
                }}
              >
                Last
              </button>
            </div>
          </div>
        )}
        
        {filteredBooks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No books found matching your criteria</p>
          </div>
        ) : (
          <div style={styles.booksGrid}>
            {filteredBooks.map(book => (
              <div key={book._id} style={{
                ...styles.bookCard,
                ...(selectedBooks.has(book._id) ? styles.bookCardSelected : {})
              }}>
                <div style={styles.bookHeader}>
                  <div style={styles.bookHeaderLeft}>
                    <input
                      type="checkbox"
                      checked={selectedBooks.has(book._id)}
                      onChange={() => toggleBookSelection(book._id)}
                      style={styles.checkbox}
                    />
                    <div style={styles.bookIcon}>📖</div>
                  </div>
                  <div style={{
                    ...styles.verificationBadge,
                    backgroundColor: book.verified ? '#10b981' : (book.condition === 'Damaged' ? '#ef4444' : book.condition === 'Lost' ? '#6b7280' : '#f59e0b')
                  }}>
                    {book.verified ? '✅ Verified' : book.condition === 'Damaged' ? '⚠️ Damaged' : book.condition === 'Lost' ? '❌ Lost' : '⏳ Pending'}
                  </div>
                </div>
                <div style={styles.bookContent}>
                  <h4 style={styles.bookTitle}>{book.title}</h4>
                  <p style={styles.bookAuthor}>by {book.author || 'Unknown Author'}</p>
                  <div style={styles.bookDetails}>
                    {book.accessionNumber && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>🏷️ Accession No.:</span>
                        <span style={styles.detailValue}>{book.accessionNumber}</span>
                      </div>
                    )}
                    {book.publisher && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>📚 Publisher:</span>
                        <span style={styles.detailValue}>{book.publisher}</span>
                      </div>
                    )}
                    {book.yearOfPublishing && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>📅 Year:</span>
                        <span style={styles.detailValue}>{book.yearOfPublishing}</span>
                      </div>
                    )}
                    {book.edition && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>📖 Edition:</span>
                        <span style={styles.detailValue}>{book.edition}</span>
                      </div>
                    )}
                    {book.category && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>📂 Category:</span>
                        <span style={styles.detailValue}>{book.category}</span>
                      </div>
                    )}
                    {book.price && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>💰 Price:</span>
                        <span style={styles.detailValue}>₹{book.price}</span>
                      </div>
                    )}
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>📊 Status:</span>
                      <span style={styles.detailValue}>{book.status || 'Available'}</span>
                    </div>
                    {book.condition && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>📋 Condition:</span>
                        <span style={styles.detailValue}>{book.condition}</span>
                      </div>
                    )}
                    {book.lastVerifiedAt && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>🕐 Last Verified:</span>
                        <span style={styles.detailValue}>
                          {new Date(book.lastVerifiedAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.verificationSection}>
                  <div style={styles.verificationStatus}>
                    <strong>Verification:</strong>
                    <span style={{
                      ...styles.statusBadge,
                      ...(book.verified ? styles.verified : styles.notVerified)
                    }}>
                      {book.verified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div style={styles.verificationActions}>
                    {!book.verified && (
                      <button
                        onClick={() => handleVerifyBook(book._id)}
                        disabled={verifying === book._id}
                        style={{
                          ...styles.verifyButton,
                          ...(verifying === book._id && styles.verifyingButton)
                        }}
                      >
                        {verifying === book._id ? '⏳ Verifying...' : '✅ Mark as Verified'}
                      </button>
                    )}
                    {(book.verified || book.condition === 'Damaged' || book.condition === 'Lost') && (
                      <button
                        onClick={() => setResetConfirm({ book, show: true })}
                        disabled={resetting === book._id}
                        style={{
                          ...styles.resetButton,
                          ...(resetting === book._id && styles.resettingButton)
                        }}
                      >
                        {resetting === book._id ? '⏳ Resetting...' : '↩️ Reset to Unverified'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Tips */}
      <div style={styles.tipsSection}>
        <h3 style={styles.tipsTitle}>💡 Verification Tips</h3>
        <div style={styles.tipsGrid}>
          <div style={styles.tipCard}>
            <div style={styles.tipIcon}>📍</div>
            <h4 style={styles.tipCardH4}>Check Location</h4>
            <p style={styles.tipCardP}>Verify the book is in its correct shelf location</p>
          </div>
          <div style={styles.tipCard}>
            <div style={styles.tipIcon}>📖</div>
            <h4 style={styles.tipCardH4}>Physical Condition</h4>
            <p style={styles.tipCardP}>Check for any damage or missing pages</p>
          </div>
          <div style={styles.tipCard}>
            <div style={styles.tipIcon}>🏷️</div>
            <h4 style={styles.tipCardH4}>Label Verification</h4>
            <p style={styles.tipCardP}>Ensure call numbers and labels are correct</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '16px'
  },
  statContent: {
    marginBottom: '16px'
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontWeight: '500'
  },
  statTrend: {
    position: 'absolute',
    top: '16px',
    right: '16px'
  },
  trendText: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '500',
    background: '#ecfdf5',
    padding: '4px 8px',
    borderRadius: '12px'
  },
  controls: {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '300px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 48px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    transition: 'all 0.2s ease'
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
    color: '#9ca3af'
  },
  filterContainer: {
    minWidth: '200px'
  },
  filterSelect: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  progressSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  progressText: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  progressBar: {
    width: '100%',
    height: '12px',
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981, #059669)',
    borderRadius: '6px',
    transition: 'width 0.6s ease'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0'
  },
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  bookCard: {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  bookHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 0 20px'
  },
  bookIcon: {
    fontSize: '24px'
  },
  verificationBadge: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '12px'
  },
  bookContent: {
    padding: '20px'
  },
  bookTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    lineHeight: '1.3'
  },
  bookAuthor: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
    fontStyle: 'italic'
  },
  bookDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '12px',
    color: '#475569',
    fontWeight: '600'
  },
  verificationSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px 20px 20px',
    borderTop: '1px solid #f1f5f9',
    marginTop: '16px',
    paddingTop: '16px'
  },
  verificationStatus: {
    textAlign: 'center',
    marginBottom: '8px'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    marginLeft: '8px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  verified: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb'
  },
  notVerified: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb'
  },
  verifyButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  verifyingButton: {
    backgroundColor: '#6b7280',
    cursor: 'not-allowed'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  tipsSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  tipsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  tipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  tipCard: {
    textAlign: 'center',
    padding: '20px'
  },
  tipIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  tipCardH4: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  tipCardP: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  inventoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  inventoryInfo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px 0',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0'
  },
  paginationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  itemsPerPageSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  paginationButton: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#f9fafb',
      borderColor: '#9ca3af'
    }
  },
  activePage: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  },
  pageNumbers: {
    display: 'flex',
    gap: '4px'
  },
  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 10000,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    animation: 'slideIn 0.3s ease-out'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 16px 0'
  },
  modalText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: '1.5'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  modalButtonConfirm: {
    backgroundColor: '#ef4444',
    color: 'white'
  },
  modalButtonDanger: {
    backgroundColor: '#dc2626',
    color: 'white'
  },
  bookHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  bookCardSelected: {
    border: '2px solid #3b82f6',
    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)'
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe'
  },
  bulkActionsText: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '500'
  },
  bulkResetButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  selectAllButton: {
    marginLeft: '12px',
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  resettingButton: {
    backgroundColor: '#6b7280',
    cursor: 'not-allowed'
  },
  verificationActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%'
  },
  resetAllContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  resetAllButton: {
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
  }
};
