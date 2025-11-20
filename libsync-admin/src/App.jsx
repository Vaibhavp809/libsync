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
    // Set body class for CSS-based scaling (simple and reliable)
    const setBodyClass = () => {
      const path = location.pathname;
      const body = document.body;
      const html = document.documentElement;
      
      if (!body) return;
      
      // Remove all route classes first
      body.classList.remove('home-page', 'login-page');
      html.classList.remove('home-page', 'login-page');
      
      // Add appropriate class based on route
      if (path === '/') {
        body.classList.add('home-page');
        html.classList.add('home-page');
      }
      // For login and all other routes, no class = 80% zoom will apply via CSS
    };
    
    // Set immediately
    setBodyClass();
    
    // Also set on next tick to ensure it persists
    setTimeout(setBodyClass, 0);
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
