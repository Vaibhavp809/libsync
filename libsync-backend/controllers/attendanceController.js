const Attendance = require('../models/Attendance');
const DailyCode = require('../models/DailyCode');
const User = require('../models/User');
const { getTodayQRCode, generateQRImage } = require('../utils/qrCodeGenerator');

// Get today's QR code and generate image
exports.getTodayQRCode = async (req, res) => {
  try {
    const dailyCode = await getTodayQRCode();
    const qrImage = await generateQRImage(dailyCode.token);
    
    res.json({
      success: true,
      data: {
        token: dailyCode.token,
        date: dailyCode.date,
        qrImage: qrImage,
        isActive: dailyCode.isActive
      }
    });
  } catch (error) {
    console.error('Error getting today\'s QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message
    });
  }
};

// Handle QR code scan (login/logout)
exports.scanQRCode = async (req, res) => {
  try {
    const { token, studentId } = req.body;
    
    if (!token || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Token and student ID are required'
      });
    }
    
    // Verify the token is valid for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyCode = await DailyCode.findOne({
      token: token,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      isActive: true
    });
    
    if (!dailyCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }
    
    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check for active session (logged in but not logged out) for today
    let attendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      logoutTime: null // Only find active sessions (not logged out)
    });
    
    const now = new Date();
    let action = '';
    
    if (!attendance) {
      // No active session - Create new login session
      attendance = new Attendance({
        student: studentId,
        date: today,
        loginTime: now,
        status: 'present'
      });
      action = 'login';
    } else {
      // Active session exists - Logout current session
      attendance.logoutTime = now;
      attendance.status = 'left';
      action = 'logout';
    }
    
    await attendance.save();
    
    res.json({
      success: true,
      message: `Successfully recorded ${action}`,
      data: {
        action: action,
        studentName: student.name,
        time: now,
        attendance: attendance
      }
    });
    
  } catch (error) {
    console.error('Error scanning QR code:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // Handle MongoDB duplicate key error (E11000)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      console.error('Duplicate key error detected - unique index may still exist in database');
      return res.status(400).json({
        success: false,
        message: 'Duplicate attendance record detected. Please run the migration script to remove the unique index constraint.',
        error: 'Database constraint violation. The unique index needs to be removed to allow multiple sessions per day.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process QR scan',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get today's attendance records
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('student', 'name email').sort({ loginTime: 1 });
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error getting today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get attendance records for a specific date range
exports.getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    const attendance = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).populate('student', 'name email').sort({ date: -1, loginTime: 1 });
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error getting attendance by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Count unique students who have at least one session today (presentToday)
    const presentTodayCount = await Attendance.distinct('student', {
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    const presentToday = presentTodayCount.length;
    
    // Count unique students who have at least one completed session (leftToday)
    const leftTodayCount = await Attendance.distinct('student', {
      date: {
        $gte: today,
        $lt: tomorrow
      },
      logoutTime: { $exists: true, $ne: null }
    });
    const leftToday = leftTodayCount.length;
    
    // Count unique students who have an active session (stillPresent - logged in but not logged out)
    const stillPresentCount = await Attendance.distinct('student', {
      date: {
        $gte: today,
        $lt: tomorrow
      },
      logoutTime: null
    });
    const stillPresent = stillPresentCount.length;
    
    res.json({
      success: true,
      data: {
        totalStudents,
        presentToday,
        leftToday,
        stillPresent
      }
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics',
      error: error.message
    });
  }
};

// Get current user's attendance history
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const attendance = await Attendance.find({
      student: userId
    }).sort({ date: -1 }).limit(30); // Get last 30 records
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error getting user attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Get current user's full attendance history
exports.getMyAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    let query = { student: userId };
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    
    const attendance = await Attendance.find(query).sort({ date: -1 });
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error getting user attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message
    });
  }
};

// Delete all attendance records (admin only)
exports.deleteAllAttendance = async (req, res) => {
  try {
    const result = await Attendance.deleteMany({});
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} attendance records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance records',
      error: error.message
    });
  }
};
