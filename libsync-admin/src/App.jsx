import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageBooks from './pages/ManageBooks';
import ViewLoans from './pages/ViewLoans';
import ViewReservations from './pages/ViewReservations';
import AttendancePanel from './pages/AttendancePanel';
import StockVerification from './pages/StockVerification';
import StockImport from './pages/StockImport';
import ManageStudents from './pages/ManageStudents';
import OverdueBooks from './pages/OverdueBooks';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import IssueBook from './pages/IssueBook';
import ReturnBook from './pages/ReturnBook';
import EResourcesPage from './pages/EResourcesPage';
import LibraryUpdatesPage from './pages/LibraryUpdatesPage';

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    // Apply scaling DIRECTLY via inline styles - this is the most reliable method
    const applyScaling = () => {
      const path = location.pathname;
      const body = document.body;
      const html = document.documentElement;
      
      if (!body) return;
      
      // Remove all route classes first
      body.classList.remove('home-page', 'login-page');
      html.classList.remove('home-page', 'login-page');
      
      // Apply scaling DIRECTLY via inline styles
      if (path === '/') {
        body.classList.add('home-page');
        html.classList.add('home-page');
        body.style.transform = '';
        body.style.width = '';
        body.style.height = '';
        body.style.transformOrigin = '';
        html.style.overflowX = '';
      } else if (path === '/login') {
        body.classList.add('login-page');
        html.classList.add('login-page');
        body.style.transform = '';
        body.style.width = '';
        body.style.height = '';
        body.style.transformOrigin = '';
        html.style.overflowX = '';
      } else {
        // All other routes - apply 80% scale DIRECTLY
        body.style.transform = 'scale(0.8)';
        body.style.transformOrigin = 'top left';
        body.style.width = '125%';
        body.style.height = '125%';
        body.style.position = 'relative';
        html.style.overflowX = 'hidden';
      }
    };
    
    // Apply immediately
    applyScaling();
    
    // Apply multiple times to ensure it sticks
    setTimeout(applyScaling, 0);
    setTimeout(applyScaling, 10);
    setTimeout(applyScaling, 50);
    setTimeout(applyScaling, 100);
  }, [location]);
  
  // Also set on mount
  useEffect(() => {
    const path = window.location.pathname;
    document.body.classList.remove('home-page', 'login-page');
    document.documentElement.classList.remove('home-page', 'login-page');
    
    if (path === '/') {
      document.body.classList.add('home-page');
      document.documentElement.classList.add('home-page');
    } else if (path === '/login') {
      document.body.classList.add('login-page');
      document.documentElement.classList.add('login-page');
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><ManageBooks /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute><ViewLoans /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><ViewReservations /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AttendancePanel /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><StockVerification /></ProtectedRoute>} />
      <Route path="/stock-import" element={<ProtectedRoute><StockImport /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><ManageStudents /></ProtectedRoute>} />
      <Route path="/overdue" element={<ProtectedRoute><OverdueBooks /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/issue-book" element={<ProtectedRoute><IssueBook /></ProtectedRoute>} />
      <Route path="/return-book" element={<ProtectedRoute><ReturnBook /></ProtectedRoute>} />
      <Route path="/eresources" element={<ProtectedRoute><EResourcesPage /></ProtectedRoute>} />
      <Route path="/library-updates" element={<ProtectedRoute><LibraryUpdatesPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
