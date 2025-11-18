import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function Reports() {
  const [stockVerificationFilters, setStockVerificationFilters] = useState({
    start: '',
    end: '',
    type: 'All',
    batchId: ''
  });
  const [attendanceFilters, setAttendanceFilters] = useState({
    start: '',
    end: ''
  });
  const [downloading, setDownloading] = useState(false);
  const [latestImport, setLatestImport] = useState(null);
  const [resetting, setResetting] = useState(false);

  const download = async (path, filename, isExcel = false) => {
    try {
      setDownloading(true);
      // Try both storage locations
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      
      if (!token) {
        alert('No authentication token found. Please login again.');
        window.location.href = '/login';
        return;
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://libsync-o0s8.onrender.com/api';
      const res = await fetch(`${API_URL}${path.replace('/api', '')}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check content type of response
      const contentType = res.headers.get('content-type');
      
      if (!res.ok || contentType?.includes('application/json')) {
        // Handle error response
        const text = await res.text();
        let errorMessage = 'Download failed';
        
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = text || `Server returned status ${res.status}`;
        }
        
        alert(errorMessage);
        
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('adminToken');
          sessionStorage.removeItem('adminToken');
          window.location.href = '/login';
        }
        return;
      }
      
      // Check content type - CSV or Excel
      if (!isExcel && !contentType?.includes('text/csv')) {
        alert('Invalid response format from server');
        return;
      }
      if (isExcel && !contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        alert('Invalid response format from server');
        return;
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert('Download started successfully');
    } catch (e) {
      alert('Download failed: ' + (e.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  // Fetch latest import info on component mount
  useEffect(() => {
    const fetchLatestImport = async () => {
      try {
        const res = await api.get('/stock/imports/latest');
        if (res.data && res.data.data) {
          setLatestImport(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch latest import:', err);
      }
    };
    fetchLatestImport();
  }, []);

  const handleStockVerificationDownload = async () => {
    const params = new URLSearchParams();
    if (stockVerificationFilters.start) {
      params.append('start', stockVerificationFilters.start);
    }
    if (stockVerificationFilters.end) {
      params.append('end', stockVerificationFilters.end);
    }
    if (stockVerificationFilters.type && stockVerificationFilters.type !== 'All') {
      params.append('type', stockVerificationFilters.type);
    }
    if (stockVerificationFilters.batchId) {
      params.append('batchId', stockVerificationFilters.batchId);
    }
    
    const queryString = params.toString();
    const path = `/api/reports/stock-verification${queryString ? '?' + queryString : ''}`;
    
    try {
      setDownloading(true);
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      
      if (!token) {
        alert('No authentication token found. Please login again.');
        window.location.href = '/login';
        return;
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://libsync-o0s8.onrender.com/api';
      const res = await fetch(`${API_URL}${path.replace('/api', '')}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errorMessage = 'Download failed';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = text || `Server returned status ${res.status}`;
        }
        alert(errorMessage);
        return;
      }
      
      // Extract filename from Content-Disposition header
      const contentDisposition = res.headers.get('content-disposition');
      let filename = `stock-verification-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert(`Download started successfully: ${filename}`);
    } catch (e) {
      alert('Download failed: ' + (e.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports & Exports</h1>
          <p style={styles.subtitle}>Export attendance, loan history, and stock verification reports</p>
        </div>
      </div>
      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>🗓️</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>Attendance CSV</h3>
            <p style={styles.cardText}>Download attendance records with date filters</p>
            <div style={styles.filterSection}>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>Start Date:</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={attendanceFilters.start}
                  onChange={(e) => setAttendanceFilters({ ...attendanceFilters, start: e.target.value })}
                />
              </div>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>End Date:</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={attendanceFilters.end}
                  onChange={(e) => setAttendanceFilters({ ...attendanceFilters, end: e.target.value })}
                />
              </div>
            </div>
            <button 
              style={styles.primaryBtn} 
              onClick={() => {
                const params = new URLSearchParams();
                if (attendanceFilters.start) {
                  params.append('startDate', attendanceFilters.start);
                }
                if (attendanceFilters.end) {
                  params.append('endDate', attendanceFilters.end);
                }
                const queryString = params.toString();
                const path = `/api/reports/attendance${queryString ? '?' + queryString : ''}`;
                download(path, 'attendance.csv');
              }}
              disabled={downloading}
            >
              {downloading ? '⏳ Downloading...' : '⬇️ Download'}
            </button>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📚</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>Loans CSV</h3>
            <p style={styles.cardText}>Download full loan history</p>
            <button 
              style={styles.primaryBtn} 
              onClick={() => download('/api/reports/loans', 'loans.csv')}
              disabled={downloading}
            >
              ⬇️ Download
            </button>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📊</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>Stock Verification Report</h3>
            <p style={styles.cardText}>Download stock verification data as Excel</p>
            {latestImport && (
              <div style={styles.latestImportInfo}>
                <small style={styles.latestImportText}>
                  Last import: {new Date(latestImport.uploadedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} 
                  {latestImport.batchId && ` (Batch: ${latestImport.batchId.substring(0, 8)}...)`}
                </small>
              </div>
            )}
            <div style={styles.filterSection}>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>Type:</label>
                <select
                  style={styles.filterSelect}
                  value={stockVerificationFilters.type}
                  onChange={(e) => setStockVerificationFilters({ ...stockVerificationFilters, type: e.target.value })}
                >
                  <option value="All">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>Start Date:</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={stockVerificationFilters.start}
                  onChange={(e) => setStockVerificationFilters({ ...stockVerificationFilters, start: e.target.value })}
                />
              </div>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>End Date:</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={stockVerificationFilters.end}
                  onChange={(e) => setStockVerificationFilters({ ...stockVerificationFilters, end: e.target.value })}
                />
              </div>
              <div style={styles.filterRow}>
                <label style={styles.filterLabel}>Batch ID (optional):</label>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter batch ID"
                    style={{ ...styles.filterInput, flex: 1, minWidth: 0 }}
                    value={stockVerificationFilters.batchId}
                    onChange={(e) => setStockVerificationFilters({ ...stockVerificationFilters, batchId: e.target.value })}
                  />
                  {latestImport && latestImport.batchId && (
                    <button
                      style={styles.useLatestButton}
                      onClick={() => setStockVerificationFilters({ ...stockVerificationFilters, batchId: latestImport.batchId })}
                    >
                      Use Latest
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button 
              style={styles.primaryBtn} 
              onClick={handleStockVerificationDownload}
              disabled={downloading}
            >
              {downloading ? '⏳ Downloading...' : '⬇️ Download Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Reset Section - At the bottom */}
      <div style={styles.resetSection}>
        <div style={styles.resetCard}>
          <div style={styles.resetIcon}>🗑️</div>
          <div style={styles.resetBody}>
            <h3 style={styles.resetTitle}>Reset Attendance Data</h3>
            <p style={styles.resetText}>
              Permanently delete all attendance records. This action cannot be undone.
            </p>
            <button 
              style={styles.dangerBtn} 
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete ALL attendance records? This action cannot be undone.')) {
                  return;
                }
                if (!window.confirm('This will permanently delete all attendance data. Are you absolutely sure?')) {
                  return;
                }
                try {
                  setResetting(true);
                  const response = await api.delete('/attendance/reset');
                  if (response.data.success) {
                    alert(`Successfully deleted ${response.data.deletedCount} attendance records.`);
                  } else {
                    alert('Failed to delete attendance records.');
                  }
                } catch (error) {
                  console.error('Error resetting attendance:', error);
                  alert(error.response?.data?.message || 'Failed to reset attendance data.');
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
            >
              {resetting ? '⏳ Deleting...' : '🗑️ Delete All Attendance Data'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: { marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' },
  subtitle: { margin: 0, color: '#64748b' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', overflow: 'hidden' },
  cardIcon: { fontSize: '24px', flexShrink: 0 },
  cardBody: { flex: 1, minWidth: 0, overflow: 'hidden' },
  cardTitle: { margin: '0 0 6px 0', color: '#1e293b' },
  cardText: { margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' },
  primaryBtn: { 
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    padding: '10px 16px', 
    cursor: 'pointer', 
    fontWeight: 600,
    width: '100%',
    transition: 'all 0.2s ease'
  },
  filterSection: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    width: '100%'
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    width: '100%',
    boxSizing: 'border-box'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
    minWidth: '80px',
    flexShrink: 0
  },
  filterSelect: {
    flex: 1,
    minWidth: 0,
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    width: '100%'
  },
  filterInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    width: '100%'
  },
  latestImportInfo: {
    marginBottom: '8px',
    padding: '8px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd'
  },
  latestImportText: {
    fontSize: '11px',
    color: '#0369a1'
  },
  useLatestButton: {
    marginLeft: '8px',
    padding: '4px 8px',
    fontSize: '11px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  resetSection: {
    marginTop: '48px',
    paddingTop: '32px',
    borderTop: '2px solid #e2e8f0'
  },
  resetCard: {
    background: 'white',
    border: '2px solid #fee2e2',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    maxWidth: '600px'
  },
  resetIcon: {
    fontSize: '32px'
  },
  resetBody: {
    flex: 1
  },
  resetTitle: {
    margin: '0 0 8px 0',
    color: '#dc2626',
    fontSize: '20px',
    fontWeight: '600'
  },
  resetText: {
    margin: '0 0 16px 0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  dangerBtn: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
  }
};


