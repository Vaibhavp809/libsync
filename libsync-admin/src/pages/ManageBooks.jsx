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
    title: '',
    author: '',
    isbn: '',
    category: '',
    ddcNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBook, setEditingBook] = useState(null);

  const handleEditBook = (book) => {
    if (!book) {
      console.warn('Tried to edit undefined book');
      return;
    }
    console.log('Editing book:', book);
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || '',
      ddcNumber: book.ddcNumber || ''
    });
    setShowForm(true);
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await api.delete(`/books/${bookId}`);
      alert('Book deleted successfully!');
      fetchBooks();
    } catch (err) {
      alert('Failed to delete book');
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredBooks, setFilteredBooks] = useState([]);

  const categories = ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Philosophy', 'Self-help', 'Software Engineering'];

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/books');
  const validBooks = Array.isArray(res.data) ? res.data.filter(b => b && typeof b === 'object' && b._id) : [];
  setBooks(validBooks);
  setFilteredBooks(validBooks);
    } catch (err) {
      alert('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (editingBook) {
      console.log('Submitting edit for book:', editingBook, 'with form:', form);
    } else {
      console.log('Submitting new book with form:', form);
    }
    try {
      if (editingBook) {
        await api.put(`/books/${editingBook._id}`, form);
        alert('Book updated successfully!');
      } else {
        await api.post('/books', form);
        alert('Book added successfully!');
      }
      setForm({ title: '', author: '', isbn: '', category: '', ddcNumber: '' });
      setShowForm(false);
      setEditingBook(null);
      fetchBooks();
    } catch (err) {
      alert('Failed to save book');
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
        book.isbn?.includes(searchTerm)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

  setFilteredBooks(filtered.filter(b => b && typeof b === 'object' && b._id));
  }, [searchTerm, selectedCategory, books]);

  const tableColumns = [
    { key: 'title', header: 'Title' },
    { key: 'author', header: 'Author' },
    { key: 'isbn', header: 'ISBN' },
    { key: 'category', header: 'Category' },
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
      render: (_, book) => {
        console.log('Table actions render book:', book);
        return (
          <div style={styles.actionButtons}>
            <button style={styles.editButton} onClick={(e) => { e.stopPropagation(); handleEditBook(book); }}>
              ✏️ Edit
            </button>
            <button style={styles.deleteButton} onClick={(e) => { e.stopPropagation(); handleDeleteBook(book._id); }}>
              🗑️ Delete
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
            {showForm ? '✕ Cancel' : '📚 Add New Book'}
          </button>
        }
      />

      {/* Add/Edit Book Form */}
      {showForm && (
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
                <label style={styles.label}>ISBN</label>
                <input
                  name="isbn"
                  placeholder="Enter ISBN"
                  value={form.isbn}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>DDC Number</label>
                <input
                  name="ddcNumber"
                  placeholder="Enter DDC number"
                  value={form.ddcNumber}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.submitButton}>
                {editingBook ? "✅ Update Book" : "✅ Add Book"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Filters */}
      <Card
        title="Search & Filter"
        subtitle="Find books by title, author, or ISBN"
        icon="🔍"
        color="#3b82f6"
        style={styles.searchCard}
      >
        <div style={styles.searchControls}>
          <SearchInput
            placeholder="Search books by title, author, or ISBN..."
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
        subtitle={`Showing ${filteredBooks.length} of ${books.length} books`}
        icon="📚"
        color="#0ea5e9"
        style={styles.tableCard}
      >
        <Table
          columns={tableColumns}
          data={filteredBooks.filter(b => b && typeof b === 'object' && b._id)}
          emptyMessage="No books found matching your criteria"
        />
      </Card>
    </Layout>
  );
}

const styles = {
  formCard: {
    marginBottom: '24px'
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
    marginBottom: '24px'
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
