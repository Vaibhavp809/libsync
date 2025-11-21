import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const width = isCollapsed ? '80px' : '280px';
    document.documentElement.style.setProperty('--sidebar-width', width);
  }, [isCollapsed]);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', color: '#3b82f6' },
    { path: '/books', label: 'Manage Books', icon: '📚', color: '#10b981' },
    { path: '/issue-book', label: 'Issue Book', icon: '📘', color: '#38bdf8' },
    { path: '/return-book', label: 'Return Book', icon: '📗', color: '#f59e0b' },
    { path: '/students', label: 'Manage Students', icon: '👩‍🎓', color: '#0ea5e9' },
    { path: '/stock', label: 'Stock Verification', icon: '📋', color: '#f59e0b' },
    { path: '/stock-import', label: 'Stock Import', icon: '📥', color: '#10b981' },
    { path: '/attendance', label: 'Attendance', icon: '📱', color: '#ec4899' },
    { path: '/loans', label: 'View Loans', icon: '🔁', color: '#8b5cf6' },
    { path: '/reservations', label: 'Reservations', icon: '📌', color: '#ef4444' },
    { path: '/overdue', label: 'Overdue Books', icon: '⏰', color: '#dc2626' },
    { path: '/reports', label: 'Reports', icon: '📈', color: '#22c55e' },
    { path: '/eresources', label: 'E-Resources', icon: '💾', color: '#8b5cf6' },
    { path: '/library-updates', label: 'Library Updates', icon: '📚', color: '#06b6d4' },
    { path: '/notifications', label: 'Notifications', icon: '🔔', color: '#f97316' },
    { path: '/settings', label: 'Settings', icon: '⚙️', color: '#6b7280' }
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    // Redirect to login
    navigate('/login');
  };

  return (
    <div style={{
      ...styles.sidebar,
      width: isCollapsed ? '80px' : '280px'
    }}>
      {/* Header */}
      <div style={styles.header}>
        <Link to="/dashboard" style={styles.logoLink}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>📘</div>
            {!isCollapsed && <h1 style={styles.logoText}>LibSync</h1>}
          </div>
        </Link>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={styles.collapseButton}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <ul style={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.path} style={styles.menuItem}>
              <Link 
                to={item.path} 
                style={{
                  ...styles.menuLink,
                  ...(isActive(item.path) && styles.activeLink),
                  backgroundColor: isActive(item.path) ? item.color : 'transparent'
                }}
              >
                <span style={styles.menuIcon}>{item.icon}</span>
                {!isCollapsed && (
                  <span style={styles.menuLabel}>{item.label}</span>
                )}
                {isActive(item.path) && (
                  <div style={{
                    ...styles.activeIndicator,
                    backgroundColor: item.color
                  }} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div style={styles.footer}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>👤</div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>Admin User</div>
              <div style={styles.userRole}>Library Administrator</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={styles.logoutButton}
            title="Logout"
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  sidebar: {
    background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    color: 'white',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1000
  },
  header: {
    padding: '16px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  logoIcon: {
    fontSize: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  collapseButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    borderRadius: '8px',
    padding: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  nav: {
    flex: 1,
    padding: '12px 0',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  menuList: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  menuItem: {
    margin: '2px 12px'
  },
  menuLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '12px',
    color: 'white',
    textDecoration: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid transparent'
  },
  activeLink: {
    transform: 'translateX(8px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  menuIcon: {
    fontSize: '20px',
    minWidth: '20px',
    textAlign: 'center'
  },
  menuLabel: {
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  activeIndicator: {
    position: 'absolute',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '20px',
    borderRadius: '2px 0 0 2px'
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  userRole: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: '2px'
  },
  logoutButton: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  }
};

export default Sidebar;
