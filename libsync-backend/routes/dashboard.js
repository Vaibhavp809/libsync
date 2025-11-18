const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { verifyStudentOrAdmin } = require('../middleware/studentAuth');
const Reservation = require('../models/Reservation');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Book = require('../models/Book');

// Get dashboard counters for the logged-in user
router.get('/counters', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const userDepartment = req.user.department;

    // Count active reservations
    const activeReservations = await Reservation.countDocuments({
      student: userId,
      status: { $in: ['Active', 'active'] } // Support both cases
    });

    // Count current loans (issued/active)
    const currentLoans = await Loan.countDocuments({
      student: userId,
      status: { $in: ['Issued', 'issued'] } // Support both cases
    });

    // Count unread notifications
    const unreadQuery = {
      status: 'active',
      'readBy.user': { $ne: userId },
      $or: [
        // New targeting fields (preferred)
        { broadcast: true },
        { recipient: userId },
        // Legacy fields (backward compatibility)
        { recipients: 'all' },
        { 
          recipients: 'specific',
          targetUsers: userId
        },
        // Legacy compatibility
        { user: userId }
      ],
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment) {
      unreadQuery.$or.push({ 
        department: userDepartment,
        broadcast: false,
        $or: [
          { recipient: { $exists: false } },
          { recipient: null }
        ]
      });
    }

    // Use distinct to get accurate count without duplicates
    const distinctIds = await Notification.find(unreadQuery).distinct('_id');
    const unreadNotifications = distinctIds.length;

    res.json({
      activeReservations,
      currentLoans,
      unreadNotifications
    });
  } catch (error) {
    console.error('Error fetching dashboard counters:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard counters', error: error.message });
  }
});

// Get admin dashboard statistics (all counts)
// Note: countDocuments() counts ALL matching documents in the database,
// regardless of pagination. This ensures accurate totals even when data
// is paginated in other endpoints (e.g., ManageStudents with 50 per page).
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can access admin dashboard statistics' });
    }

    // Get all counts in parallel for better performance
    // countDocuments() counts ALL records matching the filter (no pagination applied)
    const [
      totalBooks,
      totalStudents,
      activeLoans,
      activeReservations,
      overdueBooks
    ] = await Promise.all([
      // Total books count - counts ALL books in database
      Book.countDocuments({}),
      
      // Total students count - counts ALL students (not just current page)
      // This works correctly even when students are paginated (e.g., 50 per page)
      User.countDocuments({ role: 'student' }),
      
      // Active loans count - counts ALL active loans
      Loan.countDocuments({ status: { $in: ['Issued', 'issued'] } }),
      
      // Active reservations count - counts ALL active/reserved reservations
      Reservation.countDocuments({ status: { $in: ['Active', 'active', 'Reserved', 'reserved'] } }),
      
      // Overdue books count - counts ALL overdue loans (issued loans with dueDate < today)
      Loan.countDocuments({
        status: { $in: ['Issued', 'issued'] },
        dueDate: { $lt: new Date() }
      })
    ]);

    res.json({
      totalBooks,
      totalStudents,
      activeLoans,
      activeReservations,
      overdueBooks
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin dashboard statistics', error: error.message });
  }
});

module.exports = router;

