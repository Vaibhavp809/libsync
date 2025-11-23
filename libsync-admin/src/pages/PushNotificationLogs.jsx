import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';

export default function PushNotificationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLogs: 0,
    successfulLogs: 0,
    partialLogs: 0,
    failedLogs: 0,
    totalSent: 0,
    totalFailed: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    notificationType: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    limit: 20
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const navigate = useNavigate();

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit
      };

      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.notificationType && filters.notificationType !== 'all') {
        params.notificationType = filters.notificationType;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await api.get('/push-notification-logs', { params });
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setPagination(response.data.pagination || pagination);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching push notification logs:', error);
      alert('Failed to load push notification logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get('/push-notification-logs/stats', { params });
      
      if (response.data.success) {
        setStats(response.data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching push notification stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    fetchStats();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    fetchLogs(newPage);
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: { bg: '#dcfce7', color: '#166534' },
      partial: { bg: '#fef3c7', color: '#92400e' },
      failed: { bg: '#fee2e2', color: '#991b1b' },
      pending: { bg: '#e5e7eb', color: '#374151' }
    };
    return styles[status] || styles.pending;
  };

  const getTypeIcon = (type) => {
    const icons = {
      reservation: '📌',
      due_date: '⏰',
      announcement: '📢',
      placement: '💼',
      urgent: '🚨',
      general: '💡'
    };
    return icons[type] || '📋';
  };

  const columns = [
    {
      header: 'Date & Time',
      key: 'sentAt',
      render: (log) => formatDate(log.sentAt)
    },
    {
      header: 'Title',
      key: 'notificationTitle',
      render: (log) => (
        <div style={{ maxWidth: '300px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {getTypeIcon(log.notificationType)} {log.notificationTitle}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Type: {log.notificationType || 'general'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (log) => {
        const badgeStyle = getStatusBadge(log.status);
        return (
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.color
          }}>
            {log.status?.toUpperCase() || 'PENDING'}
          </span>
        );
      }
    },
    {
      header: 'Recipients',
      key: 'recipients',
      render: (log) => (
        <div>
          <div style={{ fontWeight: '600', color: '#10b981' }}>
            ✅ {log.successfulSends || 0} sent
          </div>
          {log.failedSends > 0 && (
            <div style={{ fontSize: '12px', color: '#ef4444' }}>
              ❌ {log.failedSends} failed
            </div>
          )}
          {log.invalidTokens > 0 && (
            <div style={{ fontSize: '12px', color: '#f59e0b' }}>
              ⚠️ {log.invalidTokens} invalid tokens
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Total',
      key: 'totalRecipients',
      render: (log) => (
        <span style={{ fontWeight: '600' }}>
          {log.totalRecipients || 0} users
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (log) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLogClick(log);
          }}
          style={styles.viewButton}
        >
          View Details
        </button>
      )
    }
  ];

  return (
    <Layout>
      <Header
        title="Push Notification Logs"
        subtitle="View and verify push notification delivery status"
        actions={
          <button 
            style={styles.refreshButton} 
            onClick={() => {
              fetchLogs(pagination.currentPage);
              fetchStats();
            }}
          >
            🔄 Refresh
          </button>
        }
      />

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <Card title="Total Logs" subtitle={`${stats.totalLogs} entries`} icon="📋" color="#3b82f6">
          <div style={styles.statValue}>{stats.totalLogs}</div>
        </Card>
        <Card title="Successful" subtitle={`${stats.successfulLogs} fully sent`} icon="✅" color="#10b981">
          <div style={styles.statValue}>{stats.successfulLogs}</div>
        </Card>
        <Card title="Partial" subtitle={`${stats.partialLogs} partially sent`} icon="⚠️" color="#f59e0b">
          <div style={styles.statValue}>{stats.partialLogs}</div>
        </Card>
        <Card title="Failed" subtitle={`${stats.failedLogs} failed`} icon="❌" color="#ef4444">
          <div style={styles.statValue}>{stats.failedLogs}</div>
        </Card>
        <Card title="Total Sent" subtitle={`${stats.totalSent} notifications`} icon="📤" color="#10b981">
          <div style={styles.statValue}>{stats.totalSent}</div>
        </Card>
        <Card title="Total Failed" subtitle={`${stats.totalFailed} failures`} icon="📥" color="#ef4444">
          <div style={styles.statValue}>{stats.totalFailed}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card title="Filters" icon="🔍" color="#6b7280" style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Notification Type</label>
            <select
              value={filters.notificationType}
              onChange={(e) => handleFilterChange('notificationType', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="reservation">Reservation</option>
              <option value="due_date">Due Date</option>
              <option value="announcement">Announcement</option>
              <option value="placement">Placement</option>
              <option value="urgent">Urgent</option>
              <option value="general">General</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              placeholder="Search by title or message..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>&nbsp;</label>
            <button
              onClick={() => {
                setFilters({
                  status: 'all',
                  notificationType: 'all',
                  startDate: '',
                  endDate: '',
                  search: ''
                });
              }}
              style={styles.clearFiltersButton}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card title={`Push Notification Logs (${pagination.totalLogs} total)`} icon="📋" color="#3b82f6">
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No push notification logs found</p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={logs}
              onRowClick={handleLogClick}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  style={styles.paginationButton}
                >
                  ← Previous
                </button>
                <span style={styles.paginationInfo}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  style={styles.paginationButton}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setShowLogDetails(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {getTypeIcon(selectedLog.notificationType)} Push Notification Details
              </h2>
              <button
                onClick={() => setShowLogDetails(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Notification Information</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Title:</span>
                  <span style={styles.detailValue}>{selectedLog.notificationTitle}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Message:</span>
                  <span style={styles.detailValue}>{selectedLog.notificationMessage}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Type:</span>
                  <span style={styles.detailValue}>{selectedLog.notificationType || 'general'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Priority:</span>
                  <span style={styles.detailValue}>{selectedLog.priority || 'medium'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Channel:</span>
                  <span style={styles.detailValue}>{selectedLog.channelId || 'default'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Sent At:</span>
                  <span style={styles.detailValue}>{formatDate(selectedLog.sentAt)}</span>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Delivery Status</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={{
                    ...styles.detailValue,
                    ...getStatusBadge(selectedLog.status),
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {selectedLog.status?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Total Recipients:</span>
                  <span style={styles.detailValue}>{selectedLog.totalRecipients || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Successful Sends:</span>
                  <span style={{ ...styles.detailValue, color: '#10b981', fontWeight: '600' }}>
                    {selectedLog.successfulSends || 0}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Failed Sends:</span>
                  <span style={{ ...styles.detailValue, color: '#ef4444', fontWeight: '600' }}>
                    {selectedLog.failedSends || 0}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Invalid Tokens:</span>
                  <span style={{ ...styles.detailValue, color: '#f59e0b', fontWeight: '600' }}>
                    {selectedLog.invalidTokens || 0}
                  </span>
                </div>
                {selectedLog.error && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Error:</span>
                    <span style={{ ...styles.detailValue, color: '#ef4444' }}>{selectedLog.error}</span>
                  </div>
                )}
              </div>

              {selectedLog.recipients && selectedLog.recipients.length > 0 && (
                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Recipients ({selectedLog.recipients.length})</h3>
                  <div style={styles.recipientsList}>
                    {selectedLog.recipients.map((recipient, index) => (
                      <div key={index} style={styles.recipientItem}>
                        <div style={styles.recipientHeader}>
                          <span style={styles.recipientName}>
                            {recipient.userName || recipient.studentID || recipient.userEmail || 'Unknown User'}
                          </span>
                          <span style={{
                            ...styles.recipientStatus,
                            ...(recipient.status === 'sent' ? { backgroundColor: '#dcfce7', color: '#166534' } :
                                recipient.status === 'failed' ? { backgroundColor: '#fee2e2', color: '#991b1b' } :
                                { backgroundColor: '#fef3c7', color: '#92400e' })
                          }}>
                            {recipient.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <div style={styles.recipientDetails}>
                          {recipient.studentID && (
                            <span style={styles.recipientDetail}>USN: {recipient.studentID}</span>
                          )}
                          {recipient.userEmail && (
                            <span style={styles.recipientDetail}>Email: {recipient.userEmail}</span>
                          )}
                          {recipient.pushToken && (
                            <span style={styles.recipientDetail}>Token: {recipient.pushToken}</span>
                          )}
                          {recipient.error && (
                            <span style={{ ...styles.recipientDetail, color: '#ef4444' }}>
                              Error: {recipient.error}
                            </span>
                          )}
                          {recipient.ticketId && (
                            <span style={styles.recipientDetail}>Ticket ID: {recipient.ticketId}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowLogDetails(false)}
                style={styles.modalCloseButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginTop: '8px'
  },
  filtersCard: {
    marginBottom: '24px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  filterSelect: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white'
  },
  clearFiltersButton: {
    padding: '10px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '24px'
  },
  refreshButton: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
    padding: '16px'
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    ':disabled': {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    }
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  modalClose: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  detailSection: {
    marginBottom: '24px'
  },
  detailSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e2e8f0'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    flex: 1
  },
  detailValue: {
    fontSize: '14px',
    color: '#1f2937',
    flex: 2,
    textAlign: 'right'
  },
  recipientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  recipientItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  recipientHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  recipientName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  recipientStatus: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600'
  },
  recipientDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280'
  },
  recipientDetail: {
    fontSize: '12px',
    color: '#6b7280'
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  modalCloseButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

