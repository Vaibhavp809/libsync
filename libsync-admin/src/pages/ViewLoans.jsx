import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../utils/api';

const styles = {
  resetButton: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      background: '#b91c1c'
    }
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0'
  },
  paginationButton: {
    padding: '10px 20px',
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
      borderColor: '#3b82f6',
      color: '#3b82f6'
    }
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      background: 'white',
      borderColor: '#d1d5db',
      color: '#374151'
    }
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  }
};

export default function ViewLoans() {
  const [loans, setLoans] = useState([]);
  const [filter, setFilter] = useState('active'); // active | returned | all
  const [settings, setSettings] = useState({ finePerDay: 10 });
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLoans, setTotalLoans] = useState(0);
  const [limit] = useState(50); // Loans per page

  const isInitialMount = useRef(true);

  const fetchLoans = async (page = currentPage, statusFilter = filter) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter
      };
      
      const response = await api.get('/loans', { params });
      
      // Handle paginated response
      let loanData = [];
      let paginationData = {};
      
      if (response.data && response.data.loans && Array.isArray(response.data.loans)) {
        loanData = response.data.loans;
        paginationData = response.data.pagination || {};
        setTotalPages(paginationData.totalPages || 1);
        setTotalLoans(paginationData.totalLoans || 0);
        setCurrentPage(paginationData.currentPage || page);
      } else if (Array.isArray(response.data)) {
        // Legacy non-paginated response
        loanData = response.data;
        setTotalPages(1);
        setTotalLoans(loanData.length);
        setCurrentPage(1);
      }
      
      setLoans(loanData);
    } catch (error) {
      console.error('Error loading loans:', error);
      alert("Error loading loans. Please check your authentication.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch loans when page changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentPage > 0) {
      fetchLoans(currentPage, filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Fetch loans when filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    setCurrentPage(1);
    fetchLoans(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [loansRes, settingsRes] = await Promise.all([
          api.get('/loans', { params: { page: 1, limit, status: filter === 'all' ? undefined : filter } }),
          api.get('/settings')
        ]);
        
        // Handle paginated response
        let loanData = [];
        let paginationData = {};
        
        if (loansRes.data && loansRes.data.loans && Array.isArray(loansRes.data.loans)) {
          loanData = loansRes.data.loans;
          paginationData = loansRes.data.pagination || {};
          setTotalPages(paginationData.totalPages || 1);
          setTotalLoans(paginationData.totalLoans || 0);
          setCurrentPage(paginationData.currentPage || 1);
        } else if (Array.isArray(loansRes.data)) {
          loanData = loansRes.data;
          setTotalPages(1);
          setTotalLoans(loanData.length);
          setCurrentPage(1);
        }
        
        setLoans(loanData);
        setSettings(settingsRes.data || { finePerDay: 10 });
      } catch (error) {
        console.error('Error loading loans:', error);
        alert("Error loading loans. Please check your authentication.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStudentLabel = (student) => {
    if (!student) return 'Unknown';
    if (typeof student === 'string') return student;
    return student.name || student.email || student.studentID || student._id || 'Unknown';
  };

  const isOverdue = (loan) => loan.status === 'Issued' && loan.dueDate && new Date(loan.dueDate) < new Date();
  
  const computeFine = (loan) => {
    if (!loan.dueDate) return 0;
    const days = Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days * (settings.finePerDay || 10));
  };

  const markReturned = async (loanId) => {
    if (!window.confirm('Mark this loan as returned?')) return;
    try {
      await api.put(`/loans/return/${loanId}`);
      await fetchLoans(currentPage, filter);
      alert('Loan marked as returned');
    } catch (e) {
      alert('Failed to mark as returned');
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `Are you sure you want to delete ALL loans? This action cannot be undone.\n\nThis will delete ${totalLoans} loan(s) and update book statuses.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete('/loans/all');
      alert('All loans deleted successfully');
      // Reset to page 1 and refresh
      setCurrentPage(1);
      await fetchLoans(1, filter);
    } catch (error) {
      console.error('Error deleting all loans:', error);
      alert(error.response?.data?.message || 'Failed to delete all loans');
    } finally {
      setLoading(false);
    }
  };

  const filtered = loans.filter(l => {
    if (filter === 'active') return l.status === 'Issued';
    if (filter === 'returned') return l.status === 'Returned';
    return true;
  });

  const columns = [
    {
      header: 'Book',
      key: 'book',
      render: (loan) => (
        <div style={{
          maxWidth: '400px',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.6'
        }}>
          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            {loan.book?.title || "Deleted Book"}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Accession No.: {loan.book?.accessionNumber || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Student',
      key: 'student',
      render: (loan) => (
        <div>
          <div style={{ fontWeight: '500' }}>
            {getStudentLabel(loan.student)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {loan.student?.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (loan) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          background: loan.status === 'Issued' ? '#dbeafe' : '#dcfce7',
          color: loan.status === 'Issued' ? '#1d4ed8' : '#166534'
        }}>
          {loan.status}
        </span>
      )
    },
    {
      header: 'Issue Date',
      key: 'issueDate',
      render: (loan) => loan.issueDate ? new Date(loan.issueDate).toLocaleDateString() : '-'
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      render: (loan) => loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '-'
    },
    {
      header: 'Return Date',
      key: 'returnDate',
      render: (loan) => {
        try {
          return loan?.returnDate ? new Date(loan.returnDate).toLocaleDateString() : '-';
        } catch (err) {
          return '-';
        }
      }
    },
    {
      header: 'Fine',
      key: 'fine',
      render: (loan) => {
        if (loan.status === 'Returned' && loan.fine > 0) {
          return <span style={{ color: '#dc2626', fontWeight: '600' }}>₹{loan.fine}</span>;
        }
        if (isOverdue(loan)) {
          return <span style={{ color: '#dc2626', fontWeight: '600' }}>₹{computeFine(loan)}</span>;
        }
        return '-';
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (loan) => (
        <div>
          {loan.status === 'Issued' && (
            <button 
              onClick={() => markReturned(loan._id)}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Return Book
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <Header 
        title="View Loans" 
        subtitle="Manage all book loans and returns"
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                fontSize: '14px'
              }}
            >
              <option value="active">Active Loans</option>
              <option value="returned">Returned Loans</option>
              <option value="all">All Loans</option>
            </select>
            <button
              onClick={handleDeleteAll}
              style={styles.resetButton}
              disabled={loading || totalLoans === 0}
              title="Delete all loans"
            >
              🗑️ Delete All
            </button>
          </div>
        }
      />
      
      <Card 
        title="Loan Records" 
        subtitle={`Showing ${filtered.length} of ${totalLoans} loans (Page ${currentPage} of ${totalPages})`} 
        icon="📚" 
        color="#3b82f6"
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading loans...</div>
          </div>
        ) : (
          <>
            <Table 
              columns={columns} 
              data={filtered}
              emptyMessage="No loans found"
            />
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={styles.paginationContainer}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === 1 || loading ? styles.paginationButtonDisabled : {})
                  }}
                >
                  ← Previous
                </button>
                
                <div style={styles.paginationInfo}>
                  Page {currentPage} of {totalPages}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === totalPages || loading ? styles.paginationButtonDisabled : {})
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </Layout>
  );
}
