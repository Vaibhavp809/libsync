const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  getTodayQRCode,
  scanQRCode,
  getTodayAttendance,
  getAttendanceByDateRange,
  getAttendanceStats,
  getMyAttendance,
  getMyAttendanceHistory,
  deleteAllAttendance
} = require('../controllers/attendanceController');
const verifyAdmin = require('../middleware/adminAuth');

// Get today's QR code (for admin dashboard)
router.get('/code', getTodayQRCode);

// Handle QR code scan (for mobile app)
router.post('/scan', verifyToken, scanQRCode);

// Get today's attendance records
router.get('/today', getTodayAttendance);

// Get attendance records by date range
router.get('/range', getAttendanceByDateRange);

// Get attendance statistics
router.get('/stats', getAttendanceStats);

// Get current user's attendance (requires authentication)
router.get('/my-attendance', verifyToken, getMyAttendance);

// Get current user's attendance history (requires authentication)
router.get('/history', verifyToken, getMyAttendanceHistory);

// Delete all attendance records (admin only)
router.delete('/reset', verifyToken, verifyAdmin, deleteAllAttendance);

module.exports = router;
