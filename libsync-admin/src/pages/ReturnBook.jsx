import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function ReturnBook() {
  const [studentEmail, setStudentEmail] = useState('');
  const [bookISBN, setBookISBN] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [returnResult, setReturnResult] = useState(null);
  const navigate = useNavigate();

  const searchStudents = async (email) => {
    if (email.length < 2) {
      setStudentSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/auth/students?email=${email}`);
      setStudentSuggestions(response.data);
    } catch (error) {
      console.error('Error searching students:', error);
      setStudentSuggestions([]);
    }
  };

  const searchBooks = async (isbn) => {
    if (isbn.length < 2) {
      setBookSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/books/search?q=${isbn}`);
      setBookSuggestions(response.data.filter(book => book.isbn && book.isbn.includes(isbn)));
    } catch (error) {
      console.error('Error searching books:', error);
      setBookSuggestions([]);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentEmail(student.email);
    setStudentSuggestions([]);
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setBookISBN(book.isbn);
    setBookSuggestions([]);
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent || !selectedBook) {
      alert('Please select both student and book');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/loans/return-by-email-isbn', {
        studentEmail: selectedStudent.email,
        bookISBN: selectedBook.isbn
      });

      setReturnResult(response.data);
      alert('Book returned successfully!');
      
      // Reset form after successful return
      setTimeout(() => {
        setStudentEmail('');
        setBookISBN('');
        setSelectedStudent(null);
        setSelectedBook(null);
        setStudentSuggestions([]);
        setBookSuggestions([]);
        setReturnResult(null);
      }, 3000);
      
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to return book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header 
        title="Return Book"
        subtitle="Return a book using student email and book ISBN"
        actions={
          <button 
            style={styles.backButton} 
            onClick={() => navigate('/loans')}
          >
            ← Back to Loans
          </button>
        }
      />

      <Card
        title="Return Book Form"
        subtitle="Search for student and book to return"
        icon="📚"
        color="#10b981"
        style={styles.formCard}
      >
        <form onSubmit={handleReturn} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Student Email</label>
              <SearchInput
                placeholder="Search student by email..."
                value={studentEmail}
                onChange={setStudentEmail}
                onSearch={searchStudents}
                suggestions={studentSuggestions}
                onSuggestionSelect={handleStudentSelect}
              />
              {selectedStudent && (
                <div style={styles.selectedInfo}>
                  <strong>Selected:</strong> {selectedStudent.name} ({selectedStudent.studentID})
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Book ISBN</label>
              <SearchInput
                placeholder="Search book by ISBN..."
                value={bookISBN}
                onChange={setBookISBN}
                onSearch={searchBooks}
                suggestions={bookSuggestions}
                onSuggestionSelect={handleBookSelect}
              />
              {selectedBook && (
                <div style={styles.selectedInfo}>
                  <strong>Selected:</strong> {selectedBook.title} by {selectedBook.author}
                </div>
              )}
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate('/loans')}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStudent || !selectedBook}
              style={styles.submitButton}
            >
              {loading ? 'Returning...' : 'Return Book'}
            </button>
          </div>
        </form>
      </Card>

      {/* Return Result */}
      {returnResult && (
        <Card
          title="Return Summary"
          subtitle="Book return details"
          icon="✅"
          color="#10b981"
          style={styles.resultCard}
        >
          <div style={styles.resultContent}>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Book:</span>
              <span style={styles.resultValue}>{returnResult.loan?.book?.title}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Student:</span>
              <span style={styles.resultValue}>{returnResult.loan?.student?.name}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Return Date:</span>
              <span style={styles.resultValue}>
                {new Date(returnResult.loan?.returnDate).toLocaleDateString()}
              </span>
            </div>
            {returnResult.loan?.fine > 0 && (
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Fine Amount:</span>
                <span style={{ ...styles.resultValue, color: '#ef4444', fontWeight: '600' }}>
                  ₹{returnResult.loan?.fine}
                </span>
              </div>
            )}
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Status:</span>
              <span style={{ 
                ...styles.resultValue, 
                color: '#10b981', 
                fontWeight: '600',
                background: '#ecfdf5',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                Returned
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Instructions Card */}
      <Card
        title="How to Return a Book"
        subtitle="Step-by-step instructions"
        icon="📖"
        color="#3b82f6"
        style={styles.instructionsCard}
      >
        <div style={styles.instructions}>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>1</span>
            <div>
              <strong>Search for Student:</strong> Start typing the student's email address. The system will show matching students.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>2</span>
            <div>
              <strong>Search for Book:</strong> Enter the book's ISBN number. The system will find the book being returned.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>3</span>
            <div>
              <strong>Return Book:</strong> Click "Return Book" to complete the return process. Any overdue fines will be calculated automatically.
            </div>
          </div>
        </div>
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
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
  selectedInfo: {
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '500',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#ecfdf5',
    borderRadius: '8px',
    border: '1px solid #d1fae5'
  },
  formActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '12px 24px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: 'white',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f9fafb',
      borderColor: '#9ca3af'
    }
  },
  submitButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    ':disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.3)'
    }
  },
  resultCard: {
    marginBottom: '24px'
  },
  resultContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  resultLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  resultValue: {
    fontSize: '14px',
    color: '#475569'
  },
  instructionsCard: {
    marginBottom: '24px'
  },
  instructions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  instructionStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
    marginTop: '2px'
  }
};
