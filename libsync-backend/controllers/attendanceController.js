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
    
    // Check existing attendance for today
    let attendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    const now = new Date();
    let action = '';
    
    if (!attendance) {
      // First scan of the day - Login
      attendance = new Attendance({
        student: studentId,
        date: today,
        loginTime: now,
        status: 'present'
      });
      action = 'login';
    } else if (!attendance.logoutTime) {
      // Second scan of the day - Logout
      attendance.logoutTime = now;
      attendance.status = 'left';
      action = 'logout';
    } else {
      // Already logged in and out today
      return res.status(400).json({
        success: false,
        message: 'Already logged in and out today'
      });
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
    res.status(500).json({
      success: false,
      message: 'Failed to process QR scan',
      error: error.message
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
    
    const totalStudents = await User.countDocuments({ role: 'student' });
    const presentToday = await Attendance.countDocuments({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    const leftToday = await Attendance.countDocuments({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      logoutTime: { $exists: true }
    });
    
    res.json({
      success: true,
      data: {
        totalStudents,
        presentToday,
        leftToday,
        stillPresent: presentToday - leftToday
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
