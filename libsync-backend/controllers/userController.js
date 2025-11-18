const User = require('../models/User');
const bcrypt = require('bcrypt');
const { normalizeDepartment, getDepartmentName } = require('../utils/departments');

exports.listStudents = async (req, res) => {
  try {
    const { 
      department, 
      studentID, 
      name, 
      email, 
      q,
      page = 1,
      limit = 50 // Default to 50 students per page
    } = req.query;
    
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (studentID) filter.studentID = studentID;
    if (name) filter.name = new RegExp(name, 'i');
    if (email) filter.email = new RegExp(email, 'i');
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { studentID: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
      ];
    }
    
    // Pagination calculations
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);
    
    // Get paginated students
    const students = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Add departmentName to each student for frontend convenience
    const studentsWithDeptName = students.map(student => ({
      ...student.toObject(),
      departmentName: getDepartmentName(student.department) || student.department
    }));
    
    res.json({
      students: studentsWithDeptName,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalStudents: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email, studentID, department, password } = req.body;
    if (!name || !email || !studentID) {
      return res.status(400).json({ message: 'name, email and studentID are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    
    // Normalize department
    const normalizedDepartment = normalizeDepartment(department);
    
    // Hash password if provided, otherwise set empty string
    let hashedPassword = '';
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const student = await User.create({ 
      name, 
      email, 
      studentID, 
      department: normalizedDepartment, 
      role: 'student', 
      password: hashedPassword
    });
    
    // Return student without password
    const studentResponse = student.toObject();
    delete studentResponse.password;
    studentResponse.departmentName = getDepartmentName(student.department) || student.department;
    
    res.status(201).json(studentResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentID, department, password } = req.body;
    
    // Build update object
    const updateData = { name, email, studentID };
    
    // Normalize department if provided
    if (department !== undefined) {
      updateData.department = normalizeDepartment(department);
    }
    
    // Hash password if provided
    if (password && password.trim()) {
      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const updated = await User.findOneAndUpdate(
      { _id: id, role: 'student' },
      updateData,
      { new: true }
    ).select('-password'); // Exclude password from response
    
    if (!updated) return res.status(404).json({ message: 'Student not found' });
    
    // Add departmentName for frontend convenience
    const updatedResponse = updated.toObject();
    updatedResponse.departmentName = getDepartmentName(updated.department) || updated.department;
    
    res.json(updatedResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reset student password
 * PUT /api/users/:id/reset-password
 * Admin-only endpoint for resetting student passwords
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Find student
    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password
    await User.findByIdAndUpdate(id, { password: hashedPassword });
    
    res.json({ 
      message: 'Password updated successfully',
      success: true
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'student' });
    if (!deleted) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


