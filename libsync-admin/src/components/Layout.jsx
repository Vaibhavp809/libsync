import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  main: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    marginLeft: 'var(--sidebar-width, 280px)'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '32px',
    border: '1px solid rgba(226, 232, 240, 0.8)'
  }
};

export default Layout;
