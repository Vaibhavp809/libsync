import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import TeamCard from '../components/TeamCard';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.nav-menu') && !event.target.closest('.hamburger')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Close mobile menu after clicking a link
      setIsMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="home-container" style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Navigation Bar */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}>
            LibSync
          </div>
          
          {/* Hamburger Menu Button */}
          <button 
            className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Mobile Menu Backdrop */}
          {isMobileMenuOpen && (
            <div 
              className="mobile-menu-backdrop"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            ></div>
          )}

          {/* Navigation Menu */}
          <div className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#download" onClick={(e) => { e.preventDefault(); scrollToSection('download'); }}>Download APK</a>
            <Link to="/login" className="nav-login" onClick={() => setIsMobileMenuOpen(false)}>Admin Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="floating-icons">
            <div className="icon icon-1">📚</div>
            <div className="icon icon-2">🔍</div>
            <div className="icon icon-3">📱</div>
            <div className="icon icon-4">✅</div>
          </div>
          <h1 className="hero-title">LibSync</h1>
          <p className="hero-tagline">Smart Library Automation With Mobile + Admin Integration</p>
          <div className="hero-buttons">
            <a 
              href="https://github.com/Vaibhavp809/LIBSYNC-APP-" 
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              📥 Download APK
            </a>
            <Link to="/login" className="btn btn-secondary">
              🔐 Admin Login
            </Link>
          </div>
        </div>
        {/* Animated SVG Wave Divider */}
        <div className="wave-divider">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="wave-svg">
            <path 
              d="M0,60 C300,100 600,20 900,60 C1050,80 1125,50 1200,60 L1200,120 L0,120 Z" 
              fill="#f8fafc"
              className="wave-path wave-path-1"
            />
            <path 
              d="M0,60 C300,80 600,40 900,60 C1050,70 1125,60 1200,60 L1200,120 L0,120 Z" 
              fill="#f8fafc"
              className="wave-path wave-path-2"
              opacity="0.7"
            />
          </svg>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <h2 className="section-title">What is LibSync?</h2>
          <div className="about-content">
            <p className="about-text">
              LibSync is a smart library automation system that modernizes traditional library workflows.
              It provides a comprehensive solution for managing library operations, from book tracking to
              student attendance, all integrated into a seamless mobile and web experience.
            </p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Admin Dashboard</h3>
                <p>Complete book management system with stock verification and import capabilities</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>QR Attendance</h3>
                <p>QR-based attendance system for students with real-time tracking</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Mobile App</h3>
                <p>Search, reserve, and access library updates on the go</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔔</div>
                <h3>Notifications</h3>
                <p>Automated overdue notifications and library updates</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📥</div>
                <h3>Stock Import</h3>
                <p>Excel/CSV bulk import or single-entry import for stock verification</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>MERN Stack</h3>
                <p>Built using MongoDB, Express, React, Node.js + React Native</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-item-icon">🔍</div>
              <div className="feature-item-content">
                <h3>Search & Reserve</h3>
                <p>Quickly search for books and reserve them directly from your mobile device</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-item-icon">📱</div>
              <div className="feature-item-content">
                <h3>QR Attendance</h3>
                <p>Scan QR codes for instant attendance tracking and verification</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-item-icon">📢</div>
              <div className="feature-item-content">
                <h3>Library Updates</h3>
                <p>Stay informed with real-time library announcements and new arrivals</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-item-icon">💻</div>
              <div className="feature-item-content">
                <h3>E-Resources Access</h3>
                <p>Access digital resources and e-books from anywhere</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-item-icon">🔄</div>
              <div className="feature-item-content">
                <h3>Book Issue / Return Automation</h3>
                <p>Streamlined book issue and return process with automated tracking</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="download-section">
        <div className="container">
          <h2 className="section-title">Get Started</h2>
          <p className="download-text">Download the LibSync mobile app to access all features</p>
          <a 
            href="https://github.com/Vaibhavp809/LIBSYNC-APP-" 
            className="btn btn-large btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            📥 Download APK
          </a>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
            Visit our <a href="https://github.com/Vaibhavp809/LIBSYNC-APP-" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'underline' }}>GitHub repository</a> to download the APK file
          </p>
        </div>
      </section>

      {/* Team/Creators Section */}
      <section id="team" className="team-section">
        <div className="container">
          <h2 className="section-title">Our Team</h2>
          <div className="team-container">
            {/* Founder - Centered */}
            <div className="team-founder">
            <TeamCard
              name="Vaibhav Parab"
              role="Founder"
                photoUrl="/images/team/vaibhav-parab.png"
              initials="VP"
            />
            </div>
            {/* Co-founders - Single Row */}
            <div className="team-cofounders">
            <TeamCard
              name="Abhishek Patil"
              role="Co-founder"
              photoUrl={null}
              initials="AP"
            />
            <TeamCard
              name="Omkar Kurane"
              role="Co-founder"
              photoUrl={null}
              initials="OK"
            />
            <TeamCard
                name="Prachi Bhosale"
              role="Co-founder"
              photoUrl={null}
              initials="PB"
            />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} LibSync. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

