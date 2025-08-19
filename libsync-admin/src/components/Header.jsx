import React from 'react';
import { useLocation } from 'react-router-dom';

const Header = ({ title, subtitle, actions }) => {
  const location = useLocation();
  
  // Get page title from current location
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard': return 'Dashboard';
      case '/books': return 'Manage Books';
      case '/students': return 'Manage Students';
      case '/loans': return 'View Loans';
      case '/reservations': return 'View Reservations';
      case '/overdue': return 'Overdue Books';
      case '/reports': return 'Reports & Exports';
      case '/notifications': return 'Notifications';
      case '/settings': return 'Settings';
      case '/issue-book': return 'Issue Book';
      case '/return-book': return 'Return Book';
      default: return 'LibSync Admin';
    }
  };

  return (
    <div style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{title || getPageTitle()}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && (
          <div style={styles.headerActions}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px 32px',
    margin: '-32px -32px 32px -32px',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  titleSection: {
    flex: 1
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  subtitle: {
    fontSize: '16px',
    margin: 0,
    opacity: 0.9,
    fontWeight: '400'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  }
};

export default Header;
