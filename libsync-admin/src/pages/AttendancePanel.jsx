import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function AttendancePanel() {
  const [qrCode, setQrCode] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    leftToday: 0,
    stillPresent: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Use the api instance which automatically adds authentication token
      // Fetch today's QR code
      const qrRes = await api.get('/attendance/code');
      setQrCode(qrRes.data.data);
      
      // Fetch today's attendance
      const attendanceRes = await api.get('/attendance/today');
      setAttendance(attendanceRes.data.data);
      
      // Fetch attendance stats
      const statsRes = await api.get('/attendance/stats');
      setStats(statsRes.data.data);
      
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceByDate = async (date) => {
    try {
      const startDate = date;
      const endDate = date;
      
      // Use the api instance which automatically adds authentication token
      const res = await api.get(`/attendance/range?startDate=${startDate}&endDate=${endDate}`);
      setAttendance(res.data.data);
    } catch (err) {
      // Error handled silently
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchAttendanceByDate(date);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (loginTime, logoutTime) => {
    if (!loginTime || !logoutTime) return 'N/A';
    
    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const durationMs = logout - login;
    
    if (durationMs < 0) return 'N/A';
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (record) => {
    if (!record.logoutTime) {
      return { text: 'Present', color: '#10b981', bg: '#ecfdf5' };
    } else {
      return { text: 'Left', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading attendance data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Daily Attendance System</h1>
          <p style={styles.subtitle}>
            Manage daily QR codes and track student attendance
          </p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.refreshButton} onClick={fetchData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      <div style={styles.qrSection}>
        <div style={styles.qrHeader}>
          <h2 style={styles.qrTitle}>📱 Today's QR Code</h2>
          <div style={styles.qrInfo}>
            <span style={styles.qrDate}>{formatDate(qrCode?.date)}</span>
            <span style={styles.qrStatus}>
              {qrCode?.isActive ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>
        
        {qrCode && (
          <div style={styles.qrContainer}>
            <div style={styles.qrImageContainer}>
              <img 
                src={qrCode.qrImage} 
                alt="Daily QR Code" 
                style={styles.qrImage}
              />
            </div>
            <div style={styles.qrDetails}>
              <div style={styles.qrToken}>
                <strong>Token:</strong> {qrCode.token}
              </div>
                             <div style={styles.qrInstructions}>
                 <h4 style={styles.qrInstructionsH4}>Instructions:</h4>
                 <ul style={styles.qrInstructionsUl}>
                   <li style={styles.qrInstructionsLi}>Students scan this QR code when entering the library</li>
                   <li style={styles.qrInstructionsLi}>They scan the same code again when leaving</li>
                   <li style={styles.qrInstructionsLi}>QR code automatically refreshes every 24 hours</li>
                 </ul>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalStudents}</h3>
            <p style={styles.statLabel}>Total Students</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.presentToday}</h3>
            <p style={styles.statLabel}>Present Today</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🚪</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.leftToday}</h3>
            <p style={styles.statLabel}>Left Today</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📚</div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.stillPresent}</h3>
            <p style={styles.statLabel}>Still Present</p>
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div style={styles.dateSection}>
        <div style={styles.dateHeader}>
          <h3 style={styles.dateTitle}>📅 Attendance Records</h3>
          <div style={styles.dateControls}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={styles.dateInput}
            />
            <button 
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={styles.todayButton}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div style={styles.recordsSection}>
        <h3 style={styles.recordsTitle}>
          📋 Attendance for {formatDate(selectedDate)} ({attendance.length} records)
        </h3>
        
        {attendance.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No attendance records found for this date</p>
          </div>
        ) : (
          <div style={styles.recordsGrid}>
            {attendance.map((record) => {
              const statusBadge = getStatusBadge(record);
              return (
                <div key={record._id} style={styles.recordCard}>
                  <div style={styles.recordHeader}>
                    <div style={styles.studentInfo}>
                      <div style={styles.studentName}>
                        {record.student?.name || 'Unknown Student'}
                      </div>
                      <div style={styles.studentEmail}>
                        {record.student?.email || 'No email'}
                      </div>
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.color
                    }}>
                      {statusBadge.text}
                    </div>
                  </div>
                  
                  <div style={styles.recordDetails}>
                    <div style={styles.timeInfo}>
                      <div style={styles.timeItem}>
                        <span style={styles.timeLabel}>🕐 Login:</span>
                        <span style={styles.timeValue}>
                          {formatTime(record.loginTime)}
                        </span>
                      </div>
                      <div style={styles.timeItem}>
                        <span style={styles.timeLabel}>🚪 Logout:</span>
                        <span style={styles.timeValue}>
                          {formatTime(record.logoutTime)}
                        </span>
                      </div>
                    </div>
                    
                    {record.logoutTime && (
                      <div style={styles.durationInfo}>
                        <span style={styles.durationLabel}>⏱️ Duration:</span>
                        <span style={styles.durationValue}>
                          {formatDuration(record.loginTime, record.logoutTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.actionsSection}>
        <h3 style={styles.actionsTitle}>⚡ Quick Actions</h3>
        <div style={styles.actionsGrid}>
          <button style={styles.actionButton} onClick={() => navigate('/reports')}>
            📊 Generate Report
          </button>
          <button style={styles.actionButton} onClick={() => navigate('/reports')}>
            📧 Export Data
          </button>
          <button style={styles.actionButton} onClick={fetchData}>
            🔄 Force Refresh QR
          </button>
          <button style={styles.actionButton} onClick={() => navigate('/settings')}>
            📱 Mobile App Guide
          </button>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
  },
  qrSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
  },
  qrHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  qrTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  qrInfo: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  qrDate: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  qrStatus: {
    fontSize: '14px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '12px',
    background: '#f1f5f9'
  },
  qrContainer: {
    display: 'flex',
    gap: '32px',
    alignItems: 'flex-start'
  },
  qrImageContainer: {
    flexShrink: 0
  },
  qrImage: {
    width: '200px',
    height: '200px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  qrDetails: {
    flex: 1
  },
  qrToken: {
    fontSize: '16px',
    marginBottom: '20px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontFamily: 'monospace'
  },
  qrInstructions: {
    color: '#475569'
  },
  qrInstructionsH4: {
    margin: '0 0 12px 0',
    color: '#1e293b'
  },
  qrInstructionsUl: {
    margin: 0,
    paddingLeft: '20px'
  },
  qrInstructionsLi: {
    marginBottom: '8px',
    lineHeight: '1.5'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    transition: 'all 0.2s ease'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '16px'
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontWeight: '500'
  },
  dateSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  dateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  dateControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  dateInput: {
    padding: '10px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  todayButton: {
    padding: '10px 16px',
    fontSize: '14px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  recordsSection: {
    marginBottom: '32px'
  },
  recordsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 24px 0'
  },
  recordsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  recordCard: {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  recordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px'
  },
  studentEmail: {
    fontSize: '14px',
    color: '#64748b'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 12px',
    borderRadius: '12px',
    textTransform: 'capitalize'
  },
  recordDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  timeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  timeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  timeValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  durationInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9'
  },
  durationLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  durationValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  actionsSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  actionsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  actionButton: {
    padding: '16px 20px',
    fontSize: '14px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    color: '#475569'
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
