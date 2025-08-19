import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageBooks from './pages/ManageBooks';
import ViewLoans from './pages/ViewLoans';
import ViewReservations from './pages/ViewReservations';
import AttendancePanel from './pages/AttendancePanel';
import StockVerification from './pages/StockVerification';
import ManageStudents from './pages/ManageStudents';
import OverdueBooks from './pages/OverdueBooks';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import IssueBook from './pages/IssueBook';
import ReturnBook from './pages/ReturnBook';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/books" element={<ManageBooks />} />
        <Route path="/loans" element={<ViewLoans />} />
        <Route path="/reservations" element={<ViewReservations />} />
        <Route path="/attendance" element={<AttendancePanel />} />
        <Route path="/stock" element={<StockVerification />} />
        <Route path="/students" element={<ManageStudents />} />
        <Route path="/overdue" element={<OverdueBooks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/issue-book" element={<IssueBook />} />
        <Route path="/return-book" element={<ReturnBook />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
