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
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete book';
      alert(errorMessage);
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredBooks, setFilteredBooks] = useState([]);

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

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/books');

      console.log('API Response:', res);

      if (!res.data) {
        console.error('No data received from books API');
        setBooks([]);
        setFilteredBooks([]);
        return;
      }

      // Log the raw data structure
      console.log('Raw books data:', res.data);

      // Validate and clean the books data
      const validBooks = Array.isArray(res.data)
        ? res.data.filter(book => {
          if (!book || typeof book !== 'object' || !book._id) {
            console.warn('Invalid book data:', book);
            return false;
          }
          // Log each book structure to understand what we're working with
          console.log('Valid book:', book);
          return true;
        })
        : [];

      console.log(`Fetched ${validBooks.length} valid books out of ${res.data.length} total`);
      setBooks(validBooks);
      setFilteredBooks(validBooks);
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
        await fetchBooks();
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

  // Filter books based on search term and category
  useEffect(() => {
    let filtered = books;

    if (searchTerm.trim()) {
      filtered = filtered.filter(book =>
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.accessionNumber?.includes(searchTerm) ||
        book.publisher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    setFilteredBooks(filtered.filter(b => b && typeof b === 'object' && b._id));
  }, [searchTerm, selectedCategory, books]);

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
                    await fetchBooks(); // Refresh the list
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

  // Fetch books only if token is present, and retry if token becomes available
  useEffect(() => {
    const getToken = () => localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (getToken()) {
      fetchBooks();
    } else {
      // Retry every 500ms until token is available (max 10 tries)
      let tries = 0;
      const interval = setInterval(() => {
        if (getToken()) {
          fetchBooks();
          clearInterval(interval);
        } else if (++tries > 10) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
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
          <button
            onClick={() => setShowForm(!showForm)}
            style={styles.addButton}
          >
            {showForm ? 'Cancel' : 'Add New Book'}
          </button>
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

      {/* Search and Filters */}
      <Card
        title="Search & Filter"
        subtitle="Find books by accession number, title, author, or publisher"
        icon="🔍"
        color="#3b82f6"
        style={styles.searchCard}
      >
        <div style={styles.searchControls}>
          <SearchInput
            placeholder="Search books by accession number, title, author, or publisher..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={styles.searchInput}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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
          <div style={styles.statNumber}>{books.length}</div>
        </Card>

        <Card
          icon="✅"
          title="Available"
          subtitle="Ready to borrow"
          color="#10b981"
        >
          <div style={styles.statNumber}>{books.filter(b => b.status === 'Available').length}</div>
        </Card>

        <Card
          icon="📖"
          title="Issued"
          subtitle="Currently borrowed"
          color="#f59e0b"
        >
          <div style={styles.statNumber}>{books.filter(b => b.status === 'Issued').length}</div>
        </Card>

        <Card
          icon="🔍"
          title="Filtered"
          subtitle="Search results"
          color="#8b5cf6"
        >
          <div style={styles.statNumber}>{filteredBooks.length}</div>
        </Card>
      </div>

      {/* Books Table */}
      <Card
        title={`Book Collection (${filteredBooks.length} books)`}
        subtitle={`Showing ${filteredBooks.length} of ${books.length} books ${filteredBooks.length > 0 ? '• Scroll horizontally to see all columns' : ''}`}
        icon="📚"
        color="#0ea5e9"
        style={styles.tableCard}
      >
        {(() => {
          const tableData = filteredBooks.filter(b => b && typeof b === 'object' && b._id);
          console.log('Final table data being passed to Table component:', tableData);
          console.log('Table columns:', tableColumns);
          return (
            <Table
              columns={tableColumns}
              data={tableData}
              emptyMessage="No books found matching your criteria"
            />
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
  }
};
