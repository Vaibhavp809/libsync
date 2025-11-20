import React from 'react';
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
