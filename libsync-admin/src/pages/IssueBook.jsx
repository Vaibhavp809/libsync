import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function IssueBook() {
  const [studentUSN, setStudentUSN] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [usnSuggestions, setUsnSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [fetchingStudent, setFetchingStudent] = useState(false);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const navigate = useNavigate();

  // Fetch settings and set default due date based on loan duration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const loanDurationDays = res.data?.loanDurationDays || 14;
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + loanDurationDays);
        setDueDate(defaultDate.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Failed to load settings, using default 14 days:', err);
        // Fallback to 14 days if settings fetch fails
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 14);
        setDueDate(defaultDate.toISOString().split('T')[0]);
      }
    };
    fetchSettings();
  }, []);

  // Fetch student details by USN
  const fetchStudentDetails = async (usn) => {
    // Only fetch if USN looks complete (at least 8 characters for pattern like 2MM22CS001)
    if (!usn || usn.length < 8) {
      setStudentDetails(null);
      setSelectedStudent(null);
      setStudentNotFound(false);
      return;
    }
    
    setFetchingStudent(true);
    try {
      const response = await api.get(`/users/student/${usn}`);
      setStudentDetails(response.data);
      setSelectedStudent(response.data.student);
      setStudentNotFound(false);
      console.log('✅ Student found:', response.data.student.name);
    } catch (error) {
      console.error('Error fetching student details:', error);
      setStudentDetails(null);
      setSelectedStudent(null);
      
      if (error.response?.status === 404) {
        // Only show "not found" for complete-looking USNs
        if (usn.length >= 10) {
          setStudentNotFound(true);
          console.log('Student not found for USN:', usn);
        } else {
          setStudentNotFound(false);
        }
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        setStudentNotFound(false);
        console.error('Authentication error. Please login again.');
        alert('Authentication error. Please login again.');
      } else {
        setStudentNotFound(false);
      }
    } finally {
      setFetchingStudent(false);
    }
  };

  const searchBooks = async (query) => {
    if (query.length < 2) {
      setBookSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/books/search?q=${query}`);
      // Handle both array response (from search endpoint) and paginated response
      const booksData = Array.isArray(response.data) ? response.data : (response.data?.books || []);
      
      // Check if query is a pure number (accession number search)
      const isPureNumber = /^\d+$/.test(query.trim());
      
      setBookSuggestions(booksData.filter(book => {
        if (!book) return false;
        
        // If query is a pure number, do exact match on accession number
        if (isPureNumber) {
          // Normalize both values for comparison (remove leading zeros, trim)
          const queryNum = query.trim().replace(/^0+/, '') || '0';
          const bookAccNum = (book.accessionNumber || '').toString().trim().replace(/^0+/, '') || '0';
          
          // Exact match on normalized numbers
          if (bookAccNum === queryNum) {
            return true;
          }
          
          // Also allow title/author search even for numeric queries
          return (
            (book.title?.toLowerCase().includes(query.toLowerCase())) ||
            (book.author?.toLowerCase().includes(query.toLowerCase()))
          );
        }
        
        // For non-numeric queries, allow substring matching on all fields
        return (
          (book.accessionNumber && book.accessionNumber.includes(query)) || 
          (book.title?.toLowerCase().includes(query.toLowerCase())) ||
          (book.author?.toLowerCase().includes(query.toLowerCase()))
        );
      }));
    } catch (error) {
      console.error('Error searching books:', error);
      setBookSuggestions([]);
    }
  };

  const searchStudentsByUSN = async (partial) => {
    if (partial.length < 2) {
      setUsnSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/users/search-usn/${partial}`);
      setUsnSuggestions(response.data);
    } catch (error) {
      console.error('Error searching students by USN:', error);
      setUsnSuggestions([]);
    }
  };

  // Effect to fetch student details when USN changes
  useEffect(() => {
    // Only set timeout for API call if USN is long enough
    if (studentUSN.length >= 8) {
      const timeoutId = setTimeout(() => {
        fetchStudentDetails(studentUSN);
      }, 500); // Debounce API calls
      
      return () => clearTimeout(timeoutId);
    } else {
      // Clear states immediately for short USNs
      setStudentDetails(null);
      setSelectedStudent(null);
      setStudentNotFound(false);
    }
  }, [studentUSN]);

  // Format accession number to 6 digits with leading zeros (only for pure numbers)
  const formatAccessionNumber = (value) => {
    // If empty, return empty
    if (!value || value.trim() === '') {
      return '';
    }
    
    const trimmedValue = value.trim();
    
    // Check if the value contains only digits (pure number)
    const isPureNumber = /^\d+$/.test(trimmedValue);
    
    if (isPureNumber) {
      // It's a pure number, pad with leading zeros to 6 digits
      // Don't limit the length - allow numbers up to 25640 and beyond
      // Just pad to 6 digits if it's less than 6 digits
      if (trimmedValue.length <= 6) {
        return trimmedValue.padStart(6, '0');
      }
      // If longer than 6 digits, return as-is (don't truncate)
      return trimmedValue;
    }
    
    // If it contains letters or other characters, return as-is (for searching by title/author)
    return value;
  };

  // Debounce timer for formatting
  const formatTimerRef = useRef(null);

  // Handle real-time input (don't format while typing)
  const handleAccessionNumberChange = (value) => {
    // Store the raw value while typing
    setAccessionNumber(value);
    
    // Clear any existing format timer
    if (formatTimerRef.current) {
      clearTimeout(formatTimerRef.current);
    }
    
    // Trigger search for suggestions immediately
    if (value.length >= 2) {
      searchBooks(value);
    } else {
      setBookSuggestions([]);
    }

    // Format after user stops typing for 1 second (only for pure numbers)
    const trimmedValue = value.trim();
    const isPureNumber = /^\d+$/.test(trimmedValue);
    
    if (isPureNumber && trimmedValue.length > 0) {
      formatTimerRef.current = setTimeout(() => {
        const formatted = formatAccessionNumber(trimmedValue);
        if (formatted !== trimmedValue) {
          setAccessionNumber(formatted);
          // Re-search with formatted value
          if (formatted.length >= 2) {
            searchBooks(formatted);
          }
        }
      }, 1000); // Format after 1 second of no typing
    }
  };

  // Effect to trigger search when bookSuggestions are updated (to show suggestions immediately)
  useEffect(() => {
    if (bookSuggestions.length > 0 && accessionNumber.length >= 2) {
      // Force suggestions to show by ensuring SearchInput component receives updated suggestions
      // This is handled by the SearchInput component's useEffect
    }
  }, [bookSuggestions, accessionNumber]);

  // Format on blur (when user leaves the field)
  // Use a small delay to avoid interfering with suggestion clicks
  const handleAccessionNumberBlur = () => {
    // Clear any pending format timer
    if (formatTimerRef.current) {
      clearTimeout(formatTimerRef.current);
    }
    
    // Small delay to allow suggestion clicks to register first
    setTimeout(() => {
      const formatted = formatAccessionNumber(accessionNumber);
      if (formatted !== accessionNumber) {
        setAccessionNumber(formatted);
        // Re-search with formatted value
        if (formatted.length >= 2) {
          searchBooks(formatted);
        }
      }
    }, 200);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (formatTimerRef.current) {
        clearTimeout(formatTimerRef.current);
      }
    };
  }, []);

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setAccessionNumber(book.accessionNumber);
    setBookSuggestions([]);
  };

  const handleUSNSelect = (student) => {
    setStudentUSN(student.studentID);
    setUsnSuggestions([]);
    // This will trigger the useEffect to fetch student details
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!selectedStudent || !selectedBook || !dueDate) {
      alert('Please fill in all fields - Student USN, Book, and Due Date are required');
      return;
    }

    // Check if student has reached the 4-book limit
    if (studentDetails && studentDetails.activeLoanCount >= 4) {
      alert('Issue limit reached — student must return a book before issuing another.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/loans', {
        studentId: selectedStudent.studentID, // Using studentID (USN)
        bookId: selectedBook._id,
        dueDate
      });

      alert(`Book issued successfully! Student now has ${response.data.studentActiveLoans} active loans.`);

      // Reset form
      setStudentUSN('');
      setAccessionNumber('');
      setSelectedStudent(null);
      setSelectedBook(null);
      setStudentDetails(null);
      setStudentNotFound(false);
      setBookSuggestions([]);

      // Navigate to loans page
      navigate('/loans');
    } catch (error) {
      console.error('Issue book error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to issue book';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header 
        title="Issue Book"
        subtitle="Issue a book to a student using USN and accession number"
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
        subtitle="Enter student USN and search for book, then set due date"
        icon="📚"
        color="#3b82f6"
        style={styles.formCard}
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Student USN *</label>
              <SearchInput
                placeholder="Enter student USN (e.g., 2MM22CS101)"
                value={studentUSN}
                onChange={(value) => setStudentUSN(value.toUpperCase())}
                onSearch={searchStudentsByUSN}
                suggestions={usnSuggestions}
                onSuggestionSelect={handleUSNSelect}
                renderSuggestion={(student) => (
                  <div style={styles.usnSuggestion}>
                    <div style={styles.usnSuggestionMain}>
                      <strong>{student.studentID}</strong> - {student.name}
                    </div>
                    <div style={styles.usnSuggestionSub}>
                      {student.department} • {student.email}
                    </div>
                  </div>
                )}
                style={{
                  borderColor: fetchingStudent ? '#f59e0b' : '#e2e8f0'
                }}
              />
              {fetchingStudent && (
                <div style={styles.loadingInfo}>
                  Loading student details...
                </div>
              )}
              {studentNotFound && (
                <div style={styles.errorInfo}>
                  Student not found. Please check the USN.
                </div>
              )}
              {studentUSN.length > 0 && studentUSN.length < 8 && (
                <div style={styles.hintInfo}>
                  Enter complete USN (e.g., 2MM22CS084)
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Book Accession Number</label>
              <SearchInput
                placeholder="Enter accession number (e.g., 1 becomes 000001) or search by title/author..."
                value={accessionNumber}
                onChange={handleAccessionNumberChange}
                onBlur={handleAccessionNumberBlur}
                onSearch={searchBooks}
                suggestions={bookSuggestions}
                onSuggestionSelect={handleBookSelect}
                renderSuggestion={(book) => (
                  <div style={styles.bookSuggestion}>
                    <div style={styles.bookSuggestionMain}>
                      <strong>{book.accessionNumber}</strong> - {book.title}
                    </div>
                    <div style={styles.bookSuggestionSub}>
                      {book.author}
                    </div>
                  </div>
                )}
              />
              {selectedBook && (
                <div style={styles.selectedInfo}>
                  <strong>Selected:</strong> {selectedBook.title} by {selectedBook.author} (#{selectedBook.accessionNumber})
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
              disabled={loading || !selectedStudent || !selectedBook || !dueDate || (studentDetails && studentDetails.activeLoanCount >= 4)}
              style={{
                ...styles.submitButton,
                ...(studentDetails && studentDetails.activeLoanCount >= 4 && styles.disabledButton)
              }}
              title={(studentDetails && studentDetails.activeLoanCount >= 4) ? 'Student has reached the 4-book limit' : ''}
            >
              {loading ? 'Issuing...' : (studentDetails && studentDetails.activeLoanCount >= 4) ? 'Issue Limit Reached' : 'Issue Book'}
            </button>
          </div>
        </form>
      </Card>

      {/* Student Details Card */}
      {studentDetails && (
        <Card
          title="Student Information"
          subtitle="Current student details and active loans"
          icon="🎓"
          color={studentDetails.activeLoanCount >= 4 ? "#ef4444" : "#10b981"}
          style={styles.studentCard}
        >
          <div style={styles.studentInfo}>
            <div style={styles.studentRow}>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Student Name:</span>
                <span style={styles.detailValue}>{studentDetails.student.name}</span>
              </div>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>USN:</span>
                <span style={styles.detailValue}>{studentDetails.student.studentID}</span>
              </div>
            </div>
            <div style={styles.studentRow}>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Department:</span>
                <span style={styles.detailValue}>{studentDetails.student.department}</span>
              </div>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Books Currently Issued:</span>
                <span style={{
                  ...styles.detailValue,
                  color: studentDetails.activeLoanCount >= 4 ? '#ef4444' : '#10b981',
                  fontWeight: '600'
                }}>
                  {studentDetails.activeLoanCount} / 4
                </span>
              </div>
            </div>
            
            {studentDetails.activeLoanCount >= 4 && (
              <div style={styles.limitWarning}>
                ⚠️ <strong>Issue Limit Reached:</strong> This student must return a book before issuing another.
              </div>
            )}
            
            {studentDetails.activeLoans.length > 0 && (
              <div style={styles.activeBooksSection}>
                <h4 style={styles.activeBooksTitle}>Currently Issued Books:</h4>
                <div style={styles.activeBooksList}>
                  {studentDetails.activeLoans.map((loan, index) => (
                    <div key={loan._id || index} style={styles.activeBookItem}>
                      <span style={styles.bookTitle}>{loan.book?.title || 'Unknown Title'}</span>
                      <span style={styles.bookAccession}>#{loan.book?.accessionNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}


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
              <strong>Enter Student USN:</strong> Type the student's USN (e.g., 2MM22CS101). The system will automatically fetch student details and show their current active loans.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>2</span>
            <div>
              <strong>Search for Book:</strong> Enter the book's accession number, title, or author. Available books will appear in the dropdown.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>3</span>
            <div>
              <strong>Set Due Date:</strong> Choose when the book should be returned. Default duration is set in Settings page.
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
  },
  loadingInfo: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#fefbf3',
    borderRadius: '8px',
    border: '1px solid #fed7aa'
  },
  errorInfo: {
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '500',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca'
  },
  hintInfo: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '400',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  studentCard: {
    marginBottom: '24px'
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  studentRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  studentDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937'
  },
  limitWarning: {
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'center'
  },
  activeBooksSection: {
    marginTop: '8px'
  },
  activeBooksTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  activeBooksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  activeBookItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  bookTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    flex: 1
  },
  bookAccession: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    background: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  disabledButton: {
    background: '#ef4444 !important',
    cursor: 'not-allowed !important'
  },
  usnSuggestion: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  usnSuggestionMain: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500'
  },
  usnSuggestionSub: {
    fontSize: '12px',
    color: '#6b7280'
  },
  bookSuggestion: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  bookSuggestionMain: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500'
  },
  bookSuggestionSub: {
    fontSize: '12px',
    color: '#6b7280'
  }
};


