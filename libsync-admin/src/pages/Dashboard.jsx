import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Card from '../components/Card';

export default function Dashboard() {
  // Ensure body class is set immediately when dashboard loads (no class = 80% scale)
  React.useEffect(() => {
    document.body.classList.remove('home-page', 'login-page');
    document.documentElement.classList.remove('home-page', 'login-page');
  }, []);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeLoans: 0,
    activeReservations: 0,
    totalStudents: 0,
    overdueBooks: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Use shared api instance with auth interceptors

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Use the new admin dashboard stats endpoint for live counts
        const statsRes = await api.get('/dashboard/admin/stats');
        
        const statsData = statsRes.data || {};
        
        setStats({
          totalBooks: statsData.totalBooks || 0,
          activeLoans: statsData.activeLoans || 0,
          activeReservations: statsData.activeReservations || 0,
          totalStudents: statsData.totalStudents || 0,
          overdueBooks: statsData.overdueBooks || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // If authentication fails, redirect to login
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/login');
        } else {
          // Fallback to individual endpoints if admin stats endpoint fails
          try {
            const [bookStatsRes, loansRes, reservationsRes, studentsRes] = await Promise.all([
              api.get('/books/statistics'),
              api.get('/loans'),
              api.get('/reservations'),
              api.get('/users?limit=1') // Just get count, not all students
            ]);

            const bookStats = bookStatsRes.data || {};
            const loans = Array.isArray(loansRes.data) ? loansRes.data : [];
            const reservations = Array.isArray(reservationsRes.data) ? reservationsRes.data : [];
            
            // For students, check if response has pagination info
            let studentCount = 0;
            if (studentsRes.data && studentsRes.data.pagination) {
              studentCount = studentsRes.data.pagination.totalStudents || 0;
            } else if (Array.isArray(studentsRes.data)) {
              studentCount = studentsRes.data.filter(u => u.role === 'student').length;
            }

            setStats({
              totalBooks: bookStats.totalBooks || 0,
              activeLoans: loans.filter(l => l.status === 'Issued').length,
              activeReservations: reservations.filter(r => r.status === 'Active' || r.status === 'Reserved').length,
              totalStudents: studentCount,
              overdueBooks: loans.filter(l => l.status === 'Issued' && new Date(l.dueDate) < new Date()).length
            });
          } catch (fallbackError) {
            console.error('Fallback stats fetch also failed:', fallbackError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds to keep counts live
    const refreshInterval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [navigate]);

  const quickActions = [
    {
      title: '📚 Manage Books',
      description: 'Add, edit, and manage library books',
      action: () => navigate('/books'),
      color: '#3b82f6'
    },
    {
      title: '👥 Manage Students',
      description: 'View and manage student records',
      action: () => navigate('/students'),
      color: '#10b981'
    },
    {
      title: '📖 View Loans',
      description: 'Track all book loans and returns',
      action: () => navigate('/loans'),
      color: '#f59e0b'
    },
    {
      title: '📌 View Reservations',
      description: 'Manage book reservations',
      action: () => navigate('/reservations'),
      color: '#8b5cf6'
    },
    {
      title: '📘 Issue Book',
      description: 'Issue a book to a student',
      action: () => navigate('/issue-book'),
      color: '#06b6d4'
    },
    {
      title: '📗 Return Book',
      description: 'Return a book from a student',
      action: () => navigate('/return-book'),
      color: '#84cc16'
    },
    {
      title: '💾 E-Resources',
      description: 'Manage digital resources and e-books',
      action: () => navigate('/eresources'),
      color: '#8b5cf6'
    },
    {
      title: '📚 Library Updates',
      description: 'Manage library announcements and updates',
      action: () => navigate('/library-updates'),
      color: '#06b6d4'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Dashboard"
        subtitle="Welcome to LibSync Admin Panel"
      />

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <Card
          icon="📚"
          title="Total Books"
          subtitle="In library"
          color="#3b82f6"
        >
          <div style={styles.statNumber}>{stats.totalBooks.toLocaleString()}</div>
        </Card>

        <Card
          icon="📖"
          title="Active Loans"
          subtitle="Currently borrowed"
          color="#f59e0b"
        >
          <div style={styles.statNumber}>{stats.activeLoans}</div>
        </Card>

        <Card
          icon="📌"
          title="Active Reservations"
          subtitle="Pending pickups"
          color="#8b5cf6"
        >
          <div style={styles.statNumber}>{stats.activeReservations}</div>
        </Card>

        <Card
          icon="👥"
          title="Total Students"
          subtitle="Registered users"
          color="#10b981"
        >
          <div style={styles.statNumber}>{stats.totalStudents}</div>
        </Card>

        <Card
          icon="⏰"
          title="Overdue Books"
          subtitle="Past due date"
          color="#ef4444"
        >
          <div style={styles.statNumber}>{stats.overdueBooks}</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card
        title="Quick Actions"
        subtitle="Common administrative tasks"
        icon="⚡"
        color="#6366f1"
        style={styles.actionsCard}
      >
        <div style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={{
                ...styles.actionButton,
                background: `linear-gradient(135deg, ${action.color}, ${action.color}dd)`
              }}
            >
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>{action.title}</div>
                <div style={styles.actionDescription}>{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </Layout>
  );
}

const styles = {
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
  actionsCard: {
    marginBottom: '24px'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  actionButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    color: 'white',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
    }
  },
  actionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0'
  },
  actionDescription: {
    fontSize: '14px',
    opacity: '0.9',
    margin: '0'
  }
};
