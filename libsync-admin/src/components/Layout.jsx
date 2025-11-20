import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div style={styles.container}>
      <Sidebar 
        isMobileOpen={isMobileMenuOpen} 
        onClose={closeMobileMenu}
      />
      
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          className={`mobile-menu-button ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          style={styles.mobileMenuButton}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
      
      <main style={styles.main} className="layout-main">
        <div style={styles.content} className="layout-content">
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
    height: '100vh',
    width: '100%',
    flex: 1,
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: 'hidden',
    position: 'relative',
    /* Ensure container doesn't interfere with fixed sidebar */
    transform: 'none',
    willChange: 'auto'
  },
  main: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    marginLeft: 'var(--sidebar-width, 280px)',
    minHeight: '100vh',
    height: '100vh',
    position: 'relative'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '32px',
    border: '1px solid rgba(226, 232, 240, 0.8)'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 1002,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    width: '40px',
    height: '40px',
    justifyContent: 'center',
    alignItems: 'center'
  }
};

export default Layout;
