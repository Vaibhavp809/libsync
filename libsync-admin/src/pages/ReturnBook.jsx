import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import SearchInput from '../components/SearchInput';
import api from '../utils/api';

export default function ReturnBook() {
  const [accessionNumber, setAccessionNumber] = useState('');
  const [accessionSuggestions, setAccessionSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [returnResult, setReturnResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  // Auto-format accession number to 6 digits
  const formatAccessionNumber = (input) => {
    // Remove any non-numeric characters
    const numericOnly = input.replace(/[^0-9]/g, '');
    // Limit to 6 digits
    const limited = numericOnly.slice(0, 6);
    // Pad with leading zeros for display (but not for input)
    return limited;
  };

  // Search accession numbers for autocomplete
  const searchAccessionNumbers = async (partial) => {
    if (partial.length === 0) {
      setAccessionSuggestions([]);
      return;
    }

    try {
      const response = await api.get(`/books/search-accession/${partial}`);
      setAccessionSuggestions(response.data);
    } catch (error) {
      console.error('Error searching accession numbers:', error);
      setAccessionSuggestions([]);
    }
  };

  // Handle accession number input change
  const handleAccessionChange = (value) => {
    const formatted = formatAccessionNumber(value);
    setAccessionNumber(formatted);
    
    // Search for suggestions if input length > 0
    if (formatted.length > 0) {
      searchAccessionNumbers(formatted);
    } else {
      setAccessionSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleAccessionSelect = (book) => {
    setAccessionNumber(book.accessionNumber);
    setAccessionSuggestions([]);
  };

  // Timer effect for countdown
  useEffect(() => {
    let interval = null;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && returnResult) {
      // Hide result after timer expires
      setReturnResult(null);
    }
    return () => clearInterval(interval);
  }, [timeLeft, returnResult]);

  const handleReturn = async (e) => {
    e.preventDefault();
    
    if (!accessionNumber.trim()) {
      alert('Please enter the accession number');
      return;
    }

    // Format to 6-digit padded accession number
    const formattedAccession = accessionNumber.padStart(6, '0');

    setLoading(true);
    try {
      const response = await api.post('/loans/return-by-accession', {
        accessionNumber: formattedAccession
      });

      setReturnResult(response.data);
      alert('Book returned successfully!');
      
      // Start 30-second countdown
      setTimeLeft(30);
      
      // Reset accession number field
      setAccessionNumber('');
      
    } catch (error) {
      console.error('Return book error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to return book';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header 
        title="Return Book"
        subtitle="Return a book using only the accession number"
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
        subtitle="Enter the accession number to return the book"
        icon="📚"
        color="#10b981"
        style={styles.formCard}
      >
        <form onSubmit={handleReturn} style={styles.form}>
          <div style={styles.singleInputRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Book Accession Number *</label>
              <SearchInput
                placeholder="Enter number (e.g., 1 becomes 000001)"
                value={accessionNumber}
                onChange={handleAccessionChange}
                onSearch={() => {}} // Search happens on change
                suggestions={accessionSuggestions}
                onSuggestionSelect={handleAccessionSelect}
                renderSuggestion={(book) => (
                  <div style={styles.accessionSuggestion}>
                    <div style={styles.accessionSuggestionMain}>
                      <strong>{book.accessionNumber}</strong> - {book.title}
                    </div>
                    <div style={styles.accessionSuggestionSub}>
                      by {book.author} • Status: 
                      <span style={{
                        color: book.status === 'Issued' ? '#ef4444' : '#10b981',
                        fontWeight: '600'
                      }}>
                        {book.status}
                      </span>
                    </div>
                  </div>
                )}
                style={styles.accessionInput}
                inputProps={{
                  required: true,
                  autoFocus: true,
                  maxLength: 6
                }}
              />
              {accessionNumber && (
                <div style={styles.formatPreview}>
                  📝 Formatted: <strong>{accessionNumber.padStart(6, '0')}</strong>
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
              disabled={loading || !accessionNumber.trim()}
              style={styles.submitButton}
            >
              {loading ? 'Processing...' : 'Return Book'}
            </button>
          </div>
        </form>
      </Card>

      {/* Return Result with Timer */}
      {returnResult && (
        <Card
          title={`Book Return Success ✅`}
          subtitle={`Student details will hide in ${timeLeft} seconds`}
          icon="🎉"
          color="#10b981"
          style={styles.resultCard}
        >
          {/* Student Information Section */}
          <div style={styles.studentSection}>
            <h3 style={styles.sectionTitle}>🎓 Student Information</h3>
            <div style={styles.studentGrid}>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Full Name:</span>
                <span style={styles.detailValue}>{returnResult.loan?.student?.name}</span>
              </div>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>USN/Student ID:</span>
                <span style={styles.detailValue}>{returnResult.loan?.student?.studentID}</span>
              </div>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Email:</span>
                <span style={styles.detailValue}>{returnResult.loan?.student?.email}</span>
              </div>
              <div style={styles.studentDetail}>
                <span style={styles.detailLabel}>Department:</span>
                <span style={styles.detailValue}>{returnResult.loan?.student?.department || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Book Information Section */}
          <div style={styles.bookSection}>
            <h3 style={styles.sectionTitle}>📚 Book Information</h3>
            <div style={styles.bookGrid}>
              <div style={styles.bookDetail}>
                <span style={styles.detailLabel}>Title:</span>
                <span style={styles.detailValue}>{returnResult.loan?.book?.title}</span>
              </div>
              <div style={styles.bookDetail}>
                <span style={styles.detailLabel}>Author:</span>
                <span style={styles.detailValue}>{returnResult.loan?.book?.author}</span>
              </div>
              <div style={styles.bookDetail}>
                <span style={styles.detailLabel}>Accession Number:</span>
                <span style={styles.detailValue}>#{returnResult.loan?.book?.accessionNumber}</span>
              </div>
            </div>
          </div>

          {/* Return Details Section */}
          <div style={styles.returnSection}>
            <h3 style={styles.sectionTitle}>⚙️ Return Details</h3>
            <div style={styles.returnGrid}>
              <div style={styles.returnDetail}>
                <span style={styles.detailLabel}>Return Date & Time:</span>
                <span style={styles.detailValue}>
                  {new Date(returnResult.loan?.returnDate).toLocaleString()}
                </span>
              </div>
              <div style={styles.returnDetail}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={styles.statusBadge}>
                  ✅ Returned Successfully
                </span>
              </div>
              {returnResult.loan?.fine > 0 ? (
                <div style={styles.returnDetail}>
                  <span style={styles.detailLabel}>Fine Amount:</span>
                  <span style={styles.fineAmount}>
                    ₹{returnResult.loan?.fine}
                  </span>
                </div>
              ) : (
                <div style={styles.returnDetail}>
                  <span style={styles.detailLabel}>Fine Status:</span>
                  <span style={styles.noFine}>
                    ✨ No Fine - Returned on Time!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          <div style={styles.timerSection}>
            <div style={styles.timerBox}>
              ⏱️ This information will automatically disappear in: <strong>{timeLeft} seconds</strong>
            </div>
          </div>
        </Card>
      )}

      {/* Instructions Card */}
      <Card
        title="How to Return a Book"
        subtitle="Simplified return process - just one step!"
        icon="📚"
        color="#3b82f6"
        style={styles.instructionsCard}
      >
        <div style={styles.instructions}>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>1</span>
            <div>
              <strong>Enter Just the Number:</strong> Type "1" and it becomes "000001", type "123" and it becomes "000123". The system auto-formats and shows available books.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>2</span>
            <div>
              <strong>View Student Details:</strong> After successful return, complete student and book details will be displayed for 30 seconds.
            </div>
          </div>
          <div style={styles.instructionStep}>
            <span style={styles.stepNumber}>3</span>
            <div>
              <strong>Automatic Processing:</strong> Fines are calculated automatically, and the book becomes available for other students immediately.
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
  singleInputRow: {
    display: 'flex',
    justifyContent: 'center'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxWidth: '500px'
  },
  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    textAlign: 'center'
  },
  accessionInput: {
    padding: '18px 24px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: 'white',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    width: '100%'
  },
  formActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
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
    padding: '12px 32px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
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
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  studentSection: {
    marginBottom: '20px',
    padding: '20px',
    background: 'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 100%)',
    borderRadius: '12px',
    border: '1px solid #bbf7d0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  bookSection: {
    marginBottom: '20px',
    padding: '20px',
    background: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  returnSection: {
    marginBottom: '20px',
    padding: '20px',
    background: 'linear-gradient(145deg, #fefbf3 0%, #fef3c7 100%)',
    borderRadius: '12px',
    border: '1px solid #fed7aa',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  returnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  studentDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px'
  },
  bookDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px'
  },
  returnDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px'
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.4'
  },
  statusBadge: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981',
    background: '#ecfdf5',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d1fae5',
    textAlign: 'center'
  },
  fineAmount: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ef4444',
    background: '#fef2f2',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    textAlign: 'center'
  },
  noFine: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981',
    background: '#ecfdf5',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d1fae5',
    textAlign: 'center'
  },
  timerSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    textAlign: 'center'
  },
  timerBox: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
    background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #f59e0b',
    display: 'inline-block',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  formatPreview: {
    fontSize: '13px',
    color: '#059669',
    fontWeight: '500',
    textAlign: 'center',
    padding: '6px 12px',
    background: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
    marginTop: '8px',
    display: 'inline-block'
  },
  accessionSuggestion: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  accessionSuggestionMain: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '600',
    lineHeight: '1.4'
  },
  accessionSuggestionSub: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.3'
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
