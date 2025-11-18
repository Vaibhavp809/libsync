const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyStudentOrAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(403).send("No token provided");
    }

    // Extract token whether it's "Bearer token" or just "token"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(403).send("No token provided");
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).send("Server configuration error");
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify that the user has either admin or student role
      if (!decoded.role || (decoded.role !== 'admin' && decoded.role !== 'student')) {
        return res.status(403).send("Access denied: Valid user role required");
      }
      
      // Fetch user from database to get department and other fields
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(404).send("User not found");
      }
      
      // Attach full user object to req.user (including department)
      req.user = {
        id: user._id,
        _id: user._id,
        role: user.role,
        department: user.department,
        studentID: user.studentID,
        name: user.name,
        email: user.email
      };
      
      next();
    } catch (err) {
      return res.status(401).send("Invalid or expired token");
    }
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
};

// Middleware specifically for student-only access (students can only access their own data)
const verifyStudentOwnership = (req, res, next) => {
  try {
    // If admin, allow access to any data
    if (req.user.role === 'admin') {
      return next();
    }

    // If student, check if they're accessing their own data
    const studentId = req.params.studentId || req.body.studentId;
    if (studentId && studentId !== req.user.id) {
      return res.status(403).send("Access denied: Students can only access their own data");
    }

    next();
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
};

module.exports = {
  verifyStudentOrAdmin,
  verifyStudentOwnership
};