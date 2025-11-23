import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import api from '../utils/api';

const styles = {
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  issueButton: {
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      background: '#047857'
    }
  },
  notifyButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      background: '#2563eb'
    },
    ':disabled': {
      background: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    width: '200px'
  },
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

export default function ViewReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ loanDurationDays: 14 });
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [usnSearch, setUsnSearch] = useState('');
  const [searchFilteredReservations, setSearchFilteredReservations] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReservations, setTotalReservations] = useState(0);
  const [limit] = useState(50); // Reservations per page

  const isInitialMount = useRef(true);
  const searchTimerRef = useRef(null);

  // Effect to handle USN search filtering (client-side on current page)
  useEffect(() => {
    if (!usnSearch.trim()) {
      setSearchFilteredReservations(reservations);
    } else {
      const searchFiltered = reservations.filter(res => {
        const studentID = res.student?.studentID || res.student?.email || '';
        return studentID.toLowerCase().includes(usnSearch.toLowerCase());
      });
      setSearchFilteredReservations(searchFiltered);
    }
  }, [reservations, usnSearch]);

  const fetchReservations = async (page = currentPage, status = selectedStatus, searchQuery = usnSearch) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: status === 'all' ? undefined : status
      };
      
      const response = await api.get('/reservations', { params });
      
      // Handle paginated response
      let reservationData = [];
      let paginationData = {};
      
      if (response.data && response.data.reservations && Array.isArray(response.data.reservations)) {
        reservationData = response.data.reservations;
        paginationData = response.data.pagination || {};
        setTotalPages(paginationData.totalPages || 1);
        setTotalReservations(paginationData.totalReservations || 0);
        setCurrentPage(paginationData.currentPage || page);
      } else if (Array.isArray(response.data)) {
        // Legacy non-paginated response
        reservationData = response.data;
        setTotalPages(1);
        setTotalReservations(reservationData.length);
        setCurrentPage(1);
      }
      
      setReservations(reservationData);
    } catch (error) {
      console.error('Error loading reservations:', error);
      alert("Error loading reservations. Please check your authentication.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch reservations when page changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentPage > 0) {
      fetchReservations(currentPage, selectedStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Fetch reservations when status changes
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    setCurrentPage(1);
    fetchReservations(1, selectedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  // Handle search - debounced
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    if (isInitialMount.current) {
      return;
    }
    
    // Client-side search on current page (no API call needed)
    // The search filtering is handled in the useEffect above
    searchTimerRef.current = setTimeout(() => {
      // Just trigger re-filtering
    }, 300);
    
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usnSearch]);

  const handleIssueBook = async (reservation) => {
    if (!reservation.book?._id || !reservation.student?._id) {
      alert('Book or student information is missing');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + settings.loanDurationDays);
      
      // First, validate the reservation
      if (reservation.status !== 'Active') {
        throw new Error('This reservation is no longer active');
      }

      // Then fulfill the reservation
      await api.put(`/reservations/${reservation._id}/fulfill`);

      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Finally, issue the book
      await api.post('/loans/issue', {
        bookId: reservation.book._id,
        studentId: reservation.student._id,
        dueDate: dueDate.toISOString()
      });

      // Refresh the reservations list
      await fetchReservations(currentPage, selectedStatus);
      alert('Book issued successfully');
    } catch (error) {
      console.error('Error issuing book:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to issue book';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `Are you sure you want to delete ALL reservations? This action cannot be undone.\n\nThis will delete ${totalReservations} reservation(s) and update book statuses.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete('/reservations/all');
      alert('All reservations deleted successfully');
      // Reset to page 1 and refresh
      setCurrentPage(1);
      await fetchReservations(1, selectedStatus);
    } catch (error) {
      console.error('Error deleting all reservations:', error);
      alert(error.response?.data?.message || 'Failed to delete all reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const [reservationsRes, settingsRes] = await Promise.all([
          api.get('/reservations', { params: { page: 1, limit, status: selectedStatus === 'all' ? undefined : selectedStatus } }),
          api.get('/settings')
        ]);
        
        // Handle paginated response
        let reservationData = [];
        let paginationData = {};
        
        if (reservationsRes.data && reservationsRes.data.reservations && Array.isArray(reservationsRes.data.reservations)) {
          reservationData = reservationsRes.data.reservations;
          paginationData = reservationsRes.data.pagination || {};
          setTotalPages(paginationData.totalPages || 1);
          setTotalReservations(paginationData.totalReservations || 0);
          setCurrentPage(paginationData.currentPage || 1);
        } else if (Array.isArray(reservationsRes.data)) {
          reservationData = reservationsRes.data;
          setTotalPages(1);
          setTotalReservations(reservationData.length);
          setCurrentPage(1);
        }
        
        setReservations(reservationData);
        setSettings(settingsRes.data || { loanDurationDays: 14 });
      } catch (error) {
        console.error('Error loading data:', error);
        alert("Error loading data. Please check your authentication.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const getStudentLabel = (student) => {
    if (!student) return 'Unknown';
    if (typeof student === 'string') return student;
    return student.name || student.email || student.studentID || student._id || 'Unknown';
  };

  const columns = [
    {
      header: 'Book',
      key: 'book',
      render: (reservation) => (
        <div style={{
          maxWidth: '400px',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.6'
        }}>
          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            {reservation.book?.title || "Deleted Book"}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Accession No.: {reservation.book?.accessionNumber || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Student',
      key: 'student',
      render: (reservation) => (
        <div style={{
          maxWidth: '300px',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.6'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
            {getStudentLabel(reservation.student)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {reservation.student?.studentID || reservation.student?.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (reservation) => {
        let style = {
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500'
        };

        switch (reservation.status) {
          case 'Active':
            style.background = '#fef3c7';
            style.color = '#92400e';
            break;
          case 'Fulfilled':
            style.background = '#dcfce7';
            style.color = '#166534';
            break;
          case 'Cancelled':
            style.background = '#fee2e2';
            style.color = '#991b1b';
            break;
          default:
            style.background = '#e5e7eb';
            style.color = '#374151';
        }

        return (
          <span style={style}>
            🟢 {reservation.status}
          </span>
        );
      }
    },
    {
      header: 'Reserved Date',
      key: 'reservedAt',
      render: (reservation) => new Date(reservation.reservedAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (reservation) => (
        <div style={styles.actionButtons}>
          {reservation.status === 'Active' && (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    setLoading(true);
                    await api.post(`/reservations/${reservation._id}/send-notification`);
                    alert(`Notification sent successfully to ${getStudentLabel(reservation.student)}!`);
                  } catch (error) {
                    console.error('Error sending notification:', error);
                    alert(error.response?.data?.message || 'Failed to send notification');
                  } finally {
                    setLoading(false);
                  }
                }}
                style={styles.notifyButton}
                disabled={loading}
                title="Send notification to student that reservation is ready"
              >
                📧 Notify Ready
              </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleIssueBook(reservation);
              }}
              style={styles.issueButton}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Issue Book'}
            </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <Layout>
      <Header 
        title="View Reservations" 
        subtitle="Manage all book reservations"
      />

      <Card 
        title="Filter Reservations" 
        subtitle="Filter reservations by their status and search by USN" 
        icon="🔍" 
        color="#3b82f6"
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="active">Active Reservations</option>
              <option value="fulfilled">Fulfilled Reservations</option>
              <option value="cancelled">Cancelled Reservations</option>
              <option value="all">All Reservations</option>
            </select>
            <input
              type="text"
              placeholder="Search by USN..."
              value={usnSearch}
              onChange={(e) => setUsnSearch(e.target.value.toUpperCase())}
              style={{
                ...styles.filterSelect,
                minWidth: '250px',
                flex: 1
              }}
            />
          </div>
          <button
            onClick={handleDeleteAll}
            style={styles.resetButton}
            disabled={loading || totalReservations === 0}
            title="Delete all reservations"
          >
            🗑️ Delete All
          </button>
        </div>
      </Card>
      
      <Card 
        title="Reservation Records" 
        subtitle={`Showing ${searchFilteredReservations.length} of ${totalReservations} ${selectedStatus} reservation${totalReservations !== 1 ? 's' : ''}${usnSearch ? ` matching "${usnSearch}"` : ''} (Page ${currentPage} of ${totalPages})`} 
        icon="📌" 
        color="#f59e0b"
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading reservations...</div>
          </div>
        ) : (
          <>
            <Table 
              columns={columns} 
              data={searchFilteredReservations}
              emptyMessage={`No ${selectedStatus} reservations found${usnSearch ? ` matching "${usnSearch}"` : ''}`}
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
