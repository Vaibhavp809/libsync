import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function StockVerification() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
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
      
      // Handle verification status filter
      if (status === 'verified') {
        // We'll filter on frontend for verification status since it's not indexed
      } else if (status === 'unverified') {
        // We'll filter on frontend for verification status since it's not indexed
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
      
      // Apply frontend verification status filter if needed
      if (status === 'verified') {
        booksData = booksData.filter(book => book.verified === true);
      } else if (status === 'unverified') {
        booksData = booksData.filter(book => book.verified !== true);
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

  const handleVerifyBook = async (bookId) => {
    try {
      setVerifying(bookId);
      await api.put(`/books/${bookId}/verify`);
      alert('Book marked as verified!');
      // Refresh current page and statistics
      await fetchBooks(currentPage, itemsPerPage, searchTerm, filterStatus);
      await fetchStatistics();
    } catch (err) {
      alert('Failed to verify book');
    } finally {
      setVerifying(null);
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
  
  // Debounced search handler
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchBooks(1, itemsPerPage, newSearchTerm, filterStatus);
    }, 300); // 300ms delay
    
    setSearchTimeout(timeout);
  };
  
  const handleStatusFilterChange = (newStatus) => {
    setFilterStatus(newStatus);
    setCurrentPage(1);
    fetchBooks(1, itemsPerPage, searchTerm, newStatus);
  };

  useEffect(() => {
    fetchBooks(1, itemsPerPage, '', 'all');
    fetchStatistics();
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
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
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stock Verification</h1>
          <p style={styles.subtitle}>
            Review and verify the physical inventory of books in your library
          </p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.refreshButton} onClick={fetchBooks}>
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
            placeholder="Search books by title, author, or accession number..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
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
              <div key={book._id} style={styles.bookCard}>
                <div style={styles.bookHeader}>
                  <div style={styles.bookIcon}>📖</div>
                  <div style={{
                    ...styles.verificationBadge,
                    backgroundColor: book.verified ? '#10b981' : '#f59e0b'
                  }}>
                    {book.verified ? '✅ Verified' : '⏳ Pending'}
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
  }
};
