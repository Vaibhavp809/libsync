const express = require('express');
const router = express.Router();
const {
  getTodayQRCode,
  scanQRCode,
  getTodayAttendance,
  getAttendanceByDateRange,
  getAttendanceStats
} = require('../controllers/attendanceController');

// Get today's QR code (for admin dashboard)
router.get('/code', getTodayQRCode);

// Handle QR code scan (for mobile app)
router.post('/scan', scanQRCode);

// Get today's attendance records
router.get('/today', getTodayAttendance);

// Get attendance records by date range
router.get('/range', getAttendanceByDateRange);

// Get attendance statistics
router.get('/stats', getAttendanceStats);

module.exports = router;
