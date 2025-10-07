import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function ManageBooks() {
  // Edit and Delete handlers and all state/hooks must be inside the component
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({
    accessionNumber: '',
    title: '',
    author: '',
    publisher: '',
    yearOfPublishing: '',
    edition: '',
    category: '',
    price: ''
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBook, setEditingBook] = useState(null);

  const handleEditBook = (book) => {
    try {
      if (!book || !book._id) {
        throw new Error('Invalid book data');
      }

      // Validate required book fields
      if (!book.title || !book.author || !book.accessionNumber) {
        throw new Error('Book is missing required fields');
      }

      // Log the book data we're about to edit
      console.log('Opening edit panel for book:', {
        id: book._id,
        accessionNumber: book.accessionNumber,
        title: book.title,
        author: book.author
      });

      // Set the form data first with proper validation
      const formData = {
        accessionNumber: book.accessionNumber ? book.accessionNumber.trim() : '',
        title: book.title.trim(),
        author: book.author.trim(),
        publisher: book.publisher ? book.publisher.trim() : '',
        yearOfPublishing: book.yearOfPublishing || '',
        edition: book.edition ? book.edition.trim() : '',
        category: book.category ? book.category.trim() : '',
        price: book.price || ''
      };

      // Important: Set these in the correct order
      setForm(formData);
      setEditingBook(book);

      // Force showForm to true after a small delay to ensure state is updated
      setTimeout(() => {
        setShowForm(true);
      }, 0);

    } catch (err) {
      console.error('Error in handleEditBook:', err);
      alert('Failed to open edit panel: ' + err.message);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!bookId) {
      alert('Invalid book selected for deletion');
      return;
    }

    // Find the book in our current list
    const bookToDelete = books.find(b => b._id === bookId);
    if (!bookToDelete) {
      alert('Book not found in current list');
      return;
    }

    // Check if the book can be deleted (not issued or reserved)
    if (bookToDelete.status === 'Issued' || bookToDelete.status === 'Reserved') {
      alert('Cannot delete a book that is currently issued or reserved');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${bookToDelete.title}"?`)) return;
    
    try {
      await api.delete(`/books/${bookId}`);
      alert('Book deleted successfully!');
      fetchBooks(currentPage, itemsPerPage, searchTerm, selectedCategory, sortBy, sortOrder);
    } catch (err) {
      console.error('Error deleting book:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete book';
      alert(errorMessage);
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [importResults, setImportResults] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('accessionNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Statistics state for performance
  const [statistics, setStatistics] = useState({
    totalBooks: 0,
    availableBooks: 0,
    issuedBooks: 0,
    reservedBooks: 0
  });

  const categories = [
    'CHEMISTRY',
    'COMPUTER SCIENCE', 
    'E&C',
    'Electronics',
    'ELECTRONICS & COMMUNICAT',
    'ELECTRONICS & COMMUNICATION',
    'GENERAL',
    'MATHEMATICS',
    'MECHANICAL ENGINEERING',
    'PHYSICS',
    'Robotics'
  ];

  const fetchBooks = async (page = 1, limit = itemsPerPage, search = searchTerm, category = selectedCategory, sort = sortBy, order = sortOrder) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page: page,
        limit: limit,
        search: search,
        category: category !== 'all' ? category : '',
        sortBy: sort,
        sortOrder: order
      };
      
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
        setFilteredBooks([]);
        return;
      }

      // Handle the new paginated response structure
      const responseData = res.data;
      const validBooks = Array.isArray(responseData.books)
        ? responseData.books.filter(book => {
          if (!book || typeof book !== 'object' || !book._id) {
            console.warn('Invalid book data:', book);
            return false;
          }
          return true;
        })
        : [];

      console.log(`Fetched ${validBooks.length} books for page ${page}`);
      
      // Update state
      setBooks(validBooks);
      setFilteredBooks(validBooks);
      
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
      if (err.response?.status === 401) {
        alert('Authentication failed. Please login again.');
      } else {
        alert('Failed to load books: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Separate function to fetch statistics
  const fetchStatistics = async () => {
    try {
      const res = await api.get('/books/statistics');
      if (res.data) {
        setStatistics({
          totalBooks: res.data.totalBooks || 0,
          availableBooks: res.data.availableBooks || 0,
          issuedBooks: res.data.issuedBooks || 0,
          reservedBooks: res.data.reservedBooks || 0
        });
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
      // Don't show error to user for statistics as it's not critical
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();

    try {
      // Validate form data
      if (!form.accessionNumber?.trim()) throw new Error('Accession Number is required');
      if (!form.title?.trim()) throw new Error('Title is required');
      if (!form.author?.trim()) throw new Error('Author is required');
      if (!form.publisher?.trim()) throw new Error('Publisher is required');
      if (!form.yearOfPublishing?.trim()) throw new Error('Year of Publishing is required');
      if (!form.edition?.trim()) throw new Error('Edition is required');
      if (!form.category?.trim()) throw new Error('Category is required');
      if (!form.price?.trim()) throw new Error('Price is required');

      // Validate year and price
      const year = parseInt(form.yearOfPublishing);
      if (isNaN(year) || year < 1000 || year > new Date().getFullYear()) {
        throw new Error('Please enter a valid year of publishing');
      }
      
      const price = parseFloat(form.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Prepare the data
      const bookData = {
        accessionNumber: form.accessionNumber.trim(),
        title: form.title.trim(),
        author: form.author.trim(),
        publisher: form.publisher.trim(),
        yearOfPublishing: year,
        edition: form.edition.trim(),
        category: form.category.trim(),
        price: price
      };

      console.log('Processing book data:', {
        ...bookData,
        action: editingBook ? 'update' : 'create',
        bookId: editingBook?._id
      });

      let response;
      if (editingBook?._id) {
        response = await api.put(`/books/${editingBook._id}`, bookData);
        console.log('Book updated:', response.data);
      } else {
        response = await api.post('/books', bookData);
        console.log('Book created:', response.data);
      }

      // Only proceed if we got a successful response
      if (response?.data) {
        alert(editingBook ? 'Book updated successfully!' : 'Book added successfully!');

        // Reset form and states
        setForm({ 
          accessionNumber: '', 
          title: '', 
          author: '', 
          publisher: '', 
          yearOfPublishing: '', 
          edition: '', 
          category: '', 
          price: '' 
        });
        setShowForm(false);
        setEditingBook(null);

        // Refresh book list
        await fetchBooks(1, itemsPerPage, searchTerm, selectedCategory, sortBy, sortOrder);
      } else {
        throw new Error('No response from server');
      }
    } catch (err) {
      console.error('Failed to save book:', err);
      alert(err.response?.data?.message || err.message || 'Failed to save book. Please try again.');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBulkImport = async () => {
    if (!bulkFile) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      setImportProgress('Uploading file...');
      
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      if (!token) {
        alert('Authentication failed. Please login again.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/books/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      setImportProgress(null);
      setImportResults(result);
      setBulkFile(null);
      
      // Refresh the book list
      await fetchBooks(1, itemsPerPage, searchTerm, selectedCategory, sortBy, sortOrder);
      
    } catch (error) {
      console.error('Bulk import error:', error);
      setImportProgress(null);
      alert('Import failed: ' + error.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('Please select an Excel (.xlsx, .xls) or CSV file');
        e.target.value = '';
        return;
      }
      
      setBulkFile(file);
      setImportResults(null);
    }
  };
  
  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchBooks(page, itemsPerPage, searchTerm, selectedCategory, sortBy, sortOrder);
  };
  
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    fetchBooks(1, newLimit, searchTerm, selectedCategory, sortBy, sortOrder);
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
      fetchBooks(1, itemsPerPage, newSearchTerm, selectedCategory, sortBy, sortOrder);
    }, 300); // 300ms delay
    
    setSearchTimeout(timeout);
  };
  
  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setCurrentPage(1);
    fetchBooks(1, itemsPerPage, searchTerm, newCategory, sortBy, sortOrder);
  };
  
  // Sorting handlers
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    fetchBooks(1, itemsPerPage, searchTerm, selectedCategory, newSortBy, sortOrder);
  };
  
  const handleSortOrderChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    fetchBooks(1, itemsPerPage, searchTerm, selectedCategory, sortBy, newSortOrder);
  };

  // Remove the old filtering useEffect since we're now doing server-side filtering
  // The filtering is now handled in the fetchBooks function with API parameters

  const tableColumns = [
    { 
      key: 'accessionNumber', 
      header: 'Acc. No.',
      render: (book) => (
        <span style={{ fontWeight: '600', color: '#1f2937' }}>
          {book.accessionNumber}
        </span>
      )
    },
    { 
      key: 'title', 
      header: 'Title',
      render: (book) => (
        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.title}>
          {book.title}
        </div>
      )
    },
    { 
      key: 'author', 
      header: 'Author',
      render: (book) => (
        <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.author}>
          {book.author}
        </div>
      )
    },
    { 
      key: 'publisher', 
      header: 'Publisher',
      render: (book) => (
        <div style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.publisher}>
          {book.publisher}
        </div>
      )
    },
    { key: 'yearOfPublishing', header: 'Year' },
    { key: 'edition', header: 'Ed.' },
    { 
      key: 'category', 
      header: 'Category',
      render: (book) => (
        <div style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.category}>
          {book.category}
        </div>
      )
    },
    {
      key: 'price',
      header: 'Price',
      render: (book) => (
        <span style={{ fontWeight: '600', color: '#059669' }}>
          {book.price ? `₹${book.price}` : '-'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (book) => (
        <span style={{
          ...styles.statusBadge,
          backgroundColor: book.status === 'Available' ? '#10b981' : '#f59e0b'
        }}>
          {book.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (book) => {
        console.log('Rendering actions for book:', book);
        
        // Validate book data
        if (!book || !book._id) {
          console.warn('Invalid book data received in actions column:', book);
          return <div style={{color: 'red', fontSize: '12px'}}>Invalid Data</div>;
        }

        console.log('Book has valid _id, rendering buttons for:', book._id);

        return (
          <div style={{
            display: 'flex',
            gap: '8px',
            minWidth: '140px',
            justifyContent: 'center'
          }}>
            <button
              style={{
                padding: '6px 12px',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                background: 'white',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                minWidth: '50px',
                whiteSpace: 'nowrap'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Edit button clicked for book:', book._id);
                handleEditBook(book);
              }}
              title="Edit book details"
            >
              Edit
            </button>
            <button
              style={{
                padding: '6px 12px',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                background: 'white',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                minWidth: '50px',
                whiteSpace: 'nowrap'
              }}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  if (window.confirm('Are you sure you want to delete this book?')) {
                    console.log('Deleting book:', book._id);
                    await api.delete(`/books/${book._id}`);
                    alert('Book deleted successfully');
                    await fetchBooks(currentPage, itemsPerPage, searchTerm, selectedCategory, sortBy, sortOrder); // Refresh the list
                  }
                } catch (err) {
                  console.error('Delete failed:', err);
                  alert('Failed to delete book: ' + (err.response?.data?.message || err.message));
                }
              }}
              title="Delete this book"
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  // Initialize data fetching
  useEffect(() => {
    const getToken = () => localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (getToken()) {
      fetchBooks(1, itemsPerPage, '', 'all', sortBy, sortOrder); // Start with page 1
      fetchStatistics(); // Load statistics separately
    } else {
      // Retry every 500ms until token is available (max 10 tries)
      let tries = 0;
      const interval = setInterval(() => {
        if (getToken()) {
          fetchBooks(1, itemsPerPage, '', 'all', sortBy, sortOrder);
          fetchStatistics();
          clearInterval(interval);
        } else if (++tries > 10) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading books...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Manage Books"
        subtitle="Add, edit, and manage your library collection"
        actions={
          <div style={styles.headerActions}>
            <button
              onClick={() => setShowBulkImport(!showBulkImport)}
              style={styles.bulkImportButton}
            >
              📄 Bulk Import
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              style={styles.addButton}
            >
              {showForm ? 'Cancel' : 'Add New Book'}
            </button>
          </div>
        }
      />

      {/* Add/Edit Book Form */}
      {/* Book Form Modal */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <Card
              title={editingBook ? "Edit Book" : "Add New Book"}
              subtitle={editingBook ? "Update book details" : "Enter book details to add to the library"}
              icon="📚"
              color="#10b981"
              style={styles.formCard}
            >
              <form onSubmit={handleAddBook} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Accession Number *</label>
                    <input
                      name="accessionNumber"
                      placeholder="Enter accession number"
                      value={form.accessionNumber}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title *</label>
                    <input
                      name="title"
                      placeholder="Enter book title"
                      value={form.title}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Author *</label>
                    <input
                      name="author"
                      placeholder="Enter author name"
                      value={form.author}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Publisher *</label>
                    <input
                      name="publisher"
                      placeholder="Enter publisher name"
                      value={form.publisher}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Year of Publishing *</label>
                    <input
                      name="yearOfPublishing"
                      type="number"
                      placeholder="Enter year (e.g. 2023)"
                      value={form.yearOfPublishing}
                      onChange={handleChange}
                      required
                      min="1000"
                      max={new Date().getFullYear()}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Edition *</label>
                    <input
                      name="edition"
                      placeholder="Enter edition (e.g. 2nd Edition)"
                      value={form.edition}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Category *</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      required
                      style={styles.select}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Price *</label>
                    <input
                      name="price"
                      type="number"
                      placeholder="Enter price in rupees"
                      value={form.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitButton}>
                    {editingBook ? "Update Book" : "Add Book"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <Card
              title="Bulk Import Books"
              subtitle="Upload Excel (.xlsx, .xls) or CSV file to import multiple books"
              icon="📄"
              color="#8b5cf6"
              style={styles.formCard}
            >
              <div style={styles.bulkImportContainer}>
                <div style={styles.uploadSection}>
                  <h4 style={styles.sectionTitle}>1. File Format Requirements</h4>
                  <div style={styles.requirements}>
                    <p>Your file should have columns with these names (case insensitive):</p>
                    <ul style={styles.requirementsList}>
                      <li><strong>Accession Number</strong> (or "Acc No", "accessionNumber")</li>
                      <li><strong>Title</strong> (or "Book Title")</li>
                      <li><strong>Author</strong> (or "Authors")</li>
                      <li><strong>Publisher</strong></li>
                      <li><strong>Year of Publishing</strong> (or "Year", "Publication Year")</li>
                      <li><strong>Edition</strong> (or "Ed") - defaults to "1st Edition"</li>
                      <li><strong>Category</strong> (or "Subject") - defaults to "GENERAL"</li>
                      <li><strong>Price</strong> (or "Cost") - defaults to 0</li>
                    </ul>
                  </div>
                  
                  <h4 style={styles.sectionTitle}>2. Select File</h4>
                  <div style={styles.fileUpload}>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      style={styles.fileInput}
                    />
                    {bulkFile && (
                      <div style={styles.selectedFile}>
                        ✅ Selected: {bulkFile.name} ({(bulkFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                  
                  {importProgress && (
                    <div style={styles.progressContainer}>
                      <div style={styles.progressText}>{importProgress}</div>
                      <div style={styles.progressBar}>
                        <div style={styles.progressFill}></div>
                      </div>
                    </div>
                  )}
                  
                  {importResults && (
                    <div style={styles.resultsContainer}>
                      <h4 style={styles.sectionTitle}>Import Results</h4>
                      <div style={styles.resultsSummary}>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Total Rows:</span>
                          <span style={styles.resultValue}>{importResults.summary.totalRows}</span>
                        </div>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Successfully Imported:</span>
                          <span style={styles.resultValueSuccess}>{importResults.summary.successful}</span>
                        </div>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Failed:</span>
                          <span style={styles.resultValueError}>{importResults.summary.failed}</span>
                        </div>
                        <div style={styles.resultItem}>
                          <span style={styles.resultLabel}>Duplicates Skipped:</span>
                          <span style={styles.resultValueWarning}>{importResults.summary.duplicates}</span>
                        </div>
                      </div>
                      
                      {importResults.errors && importResults.errors.length > 0 && (
                        <div style={styles.errorsList}>
                          <h5>First Few Errors:</h5>
                          {importResults.errors.slice(0, 5).map((error, index) => (
                            <div key={index} style={styles.errorItem}>
                              <strong>Row {error.row}:</strong> {error.error}
                            </div>
                          ))}
                          {importResults.errors.length > 5 && (
                            <div style={styles.moreErrors}>
                              ... and {importResults.errors.length - 5} more errors
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div style={styles.formActions}>
                  <button 
                    onClick={handleBulkImport} 
                    disabled={!bulkFile || importProgress}
                    style={{
                      ...styles.submitButton,
                      opacity: (!bulkFile || importProgress) ? 0.5 : 1,
                      cursor: (!bulkFile || importProgress) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {importProgress ? 'Importing...' : 'Start Import'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowBulkImport(false);
                      setBulkFile(null);
                      setImportResults(null);
                      setImportProgress(null);
                    }} 
                    style={styles.cancelButton}
                  >
                    Close
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card
        title="Search, Filter & Sort"
        subtitle="Find and organize books by accession number, title, author, category, or date"
        icon="🔍"
        color="#3b82f6"
        style={styles.searchCard}
      >
        <div style={styles.searchControls}>
          <SearchInput
            placeholder="Search books by accession number, title, author, or publisher..."
            value={searchTerm}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="accessionNumber">Sort by Acc. Number</option>
            <option value="title">Sort by Title</option>
            <option value="author">Sort by Author</option>
            <option value="createdAt">Sort by Date Added</option>
            <option value="category">Sort by Category</option>
          </select>
          
          <button
            onClick={() => handleSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={styles.sortOrderButton}
            title={`Currently sorting ${sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
          >
            {sortOrder === 'asc' ? '🔼' : '🔽'} {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
          </button>
        </div>
      </Card>

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <Card
          icon="📚"
          title="Total Books"
          subtitle="In library"
          color="#3b82f6"
        >
          <div style={styles.statNumber}>{statistics.totalBooks.toLocaleString()}</div>
        </Card>

        <Card
          icon="✅"
          title="Available"
          subtitle="Ready to borrow"
          color="#10b981"
        >
          <div style={styles.statNumber}>{statistics.availableBooks.toLocaleString()}</div>
        </Card>

        <Card
          icon="📖"
          title="Issued"
          subtitle="Currently borrowed"
          color="#f59e0b"
        >
          <div style={styles.statNumber}>{statistics.issuedBooks.toLocaleString()}</div>
        </Card>

        <Card
          icon="🔍"
          title="Current Page"
          subtitle={`Page ${currentPage} of ${totalPages}`}
          color="#8b5cf6"
        >
          <div style={styles.statNumber}>{filteredBooks.length}</div>
        </Card>
      </div>

      {/* Books Table */}
      <Card
        title={`Book Collection`}
        subtitle={`Showing ${filteredBooks.length} books on page ${currentPage} of ${totalPages} • Total: ${totalBooks.toLocaleString()} books`}
        icon="📚"
        color="#0ea5e9"
        style={styles.tableCard}
      >
        {(() => {
          const tableData = filteredBooks.filter(b => b && typeof b === 'object' && b._id);
          console.log('Final table data being passed to Table component:', tableData);
          console.log('Table columns:', tableColumns);
          return (
            <div>
              <Table
                columns={tableColumns}
                data={tableData}
                emptyMessage="No books found matching your criteria"
              />
              
              {/* Pagination Controls */}
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
            </div>
          );
        })()}
      </Card>
    </Layout>
  );
}

const styles = {
  cancelButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600'
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
    alignItems: 'flex-start',
    padding: '2rem',
    zIndex: 1000,
    overflowY: 'auto'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  formCard: {
    marginBottom: '24px',
    width: '100%'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    cursor: 'pointer',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    }
  },
  addButton: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    }
  },
  searchCard: {
    marginBottom: '24px'
  },
  searchControls: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '300px'
  },
  filterSelect: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '200px',
    outline: 'none',
    transition: 'all 0.2s ease',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  },
  tableCard: {
    marginBottom: '24px',
    overflow: 'visible'
  },
  tableWrapper: {
    position: 'relative',
    overflow: 'auto',
    maxWidth: '100%'
  },
  statusBadge: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '12px',
    textTransform: 'capitalize'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    padding: '6px 12px',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    background: 'white',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#3b82f6',
      color: 'white'
    }
  },
  deleteButton: {
    padding: '6px 12px',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    background: 'white',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#ef4444',
      color: 'white'
    }
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
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  bulkImportButton: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
    }
  },
  bulkImportContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0'
  },
  requirements: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  requirementsList: {
    margin: '8px 0 0 16px',
    color: '#4b5563'
  },
  fileUpload: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  fileInput: {
    padding: '12px 16px',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    fontSize: '14px'
  },
  selectedFile: {
    padding: '8px 12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px'
  },
  progressContainer: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #f59e0b'
  },
  progressText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#92400e',
    marginBottom: '8px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#fed7aa',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    width: '100%',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  resultsContainer: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #3b82f6'
  },
  resultsSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '6px'
  },
  resultLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  resultValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151'
  },
  resultValueSuccess: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#059669'
  },
  resultValueError: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#dc2626'
  },
  resultValueWarning: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#d97706'
  },
  errorsList: {
    backgroundColor: '#fef2f2',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #fecaca'
  },
  errorItem: {
    fontSize: '13px',
    color: '#b91c1c',
    marginBottom: '4px'
  },
  moreErrors: {
    fontSize: '13px',
    color: '#991b1b',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    padding: '16px 0',
    borderTop: '1px solid #e2e8f0'
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
  sortOrderButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    ':hover': {
      backgroundColor: '#f9fafb',
      borderColor: '#9ca3af'
    }
  }
};
