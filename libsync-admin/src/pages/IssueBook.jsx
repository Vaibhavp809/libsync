import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function IssueBook() {
  const [studentEmail, setStudentEmail] = useState('');
  const [studentID, setStudentID] = useState('');
  const [bookISBN, setBookISBN] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();

  // Set default due date to 14 days from now
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    setDueDate(defaultDate.toISOString().split('T')[0]);
  }, []);

  // Search by email or studentID/USN
  const searchStudents = async (query) => {
    if (query.length < 2) {
      setStudentSuggestions([]);
      return;
    }
    try {
      // Try both email and studentID
      const response = await api.get(`/users?q=${query}`);
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
    setStudentID(student.studentID);
    setStudentSuggestions([]);
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setBookISBN(book.isbn);
    setBookSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Try to auto-select student if not already selected
    let student = selectedStudent;
    if (!student && (studentEmail || studentID) && studentSuggestions.length > 0) {
      student = studentSuggestions.find(s => s.email === studentEmail || s.studentID === studentID) || studentSuggestions[0];
      setSelectedStudent(student);
    }

    // Try to auto-select book if not already selected
    let book = selectedBook;
    if (!book && bookISBN && bookSuggestions.length > 0) {
      book = bookSuggestions.find(b => b.isbn === bookISBN) || bookSuggestions[0];
      setSelectedBook(book);
    }

    if (!student || !book || !dueDate) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/loans/issue-by-email-isbn', {
        studentEmail: student.email,
        studentID: student.studentID,
        bookISBN: book.isbn,
        dueDate
      });

      alert('Book issued successfully!');

      // Reset form
      setStudentEmail('');
      setBookISBN('');
      setSelectedStudent(null);
      setSelectedBook(null);
      setStudentSuggestions([]);
      setBookSuggestions([]);

      // Navigate to loans page
      navigate('/loans');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to issue book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header 
        title="Issue Book"
        subtitle="Issue a book to a student using email and ISBN"
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
        title="Issue Book Form"
        subtitle="Search for student and book, then set due date"
        icon="📚"
        color="#3b82f6"
        style={styles.formCard}
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Student Email or USN</label>
              <SearchInput
                placeholder="Search student by email or USN..."
                value={studentEmail || studentID}
                onChange={val => { setStudentEmail(val); setStudentID(val); }}
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

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={styles.dateInput}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Loan Duration</label>
              <div style={styles.durationInfo}>
                {dueDate && (
                  <span>
                    {Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </span>
                )}
              </div>
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
              disabled={loading || !selectedStudent || !selectedBook || !dueDate}
              style={styles.submitButton}
            >
              {loading ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </form>
      </Card>

      {/* Instructions Card */}
      <Card
        title="How to Issue a Book"
        subtitle="Step-by-step instructions"
        icon="📖"
        color="#10b981"
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
              <strong>Search for Book:</strong> Enter the book's ISBN number. Available books will appear in the dropdown.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>3</span>
            <div>
              <strong>Set Due Date:</strong> Choose when the book should be returned. Default is 14 days from today.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>4</span>
            <div>
              <strong>Issue Book:</strong> Click "Issue Book" to complete the transaction.
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
  dateInput: {
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
  durationInfo: {
    padding: '12px 16px',
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#475569',
    fontWeight: '500'
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
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
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
    background: '#10b981',
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


