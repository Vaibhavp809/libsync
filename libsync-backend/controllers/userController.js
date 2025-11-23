const User = require('../models/User');
const bcrypt = require('bcrypt');
const { normalizeDepartment, getDepartmentName } = require('../utils/departments');

// Helper function to extract department code from student ID (e.g., 2MM22CS*** -> CS)
const extractDepartmentCodeFromId = (studentID) => {
  if (!studentID || typeof studentID !== 'string' || studentID.length < 7) {
    return null;
  }
  // Format: 2MM22CS*** (college code: 3 chars, year: 2 chars, dept: 2 chars)
  // Position 5-6 should be department code
  const deptCode = studentID.substring(5, 7).toUpperCase();
  return /^[A-Z]{2}$/.test(deptCode) ? deptCode : null;
};

// Helper function to extract year from student ID (e.g., 2MM22CS*** -> 22)
const extractYearFromId = (studentID) => {
  if (!studentID || typeof studentID !== 'string' || studentID.length < 5) {
    return null;
  }
  // Format: 2MM22CS*** (college code: 3 chars, year: 2 chars)
  // Position 3-4 should be year
  const yearStr = studentID.substring(3, 5);
  const year = parseInt(yearStr);
  return !isNaN(year) && year >= 0 && year <= 99 ? year : null;
};

exports.listStudents = async (req, res) => {
  try {
    const Department = require('../models/Department');
    const { 
      department, 
      departmentCode, // Filter by department code from student ID (CS, EC, etc.)
      studentID, 
      name, 
      email, 
      q,
      sortBy = 'createdAt', // Options: 'createdAt', 'studentID', 'year'
      sortOrder = 'desc', // 'asc' or 'desc'
      page = 1,
      limit = 50 // Default to 50 students per page
    } = req.query;
    
    const filter = { role: 'student' };
    
    // Department filter - check both department field and department code from student ID
    if (department) {
      filter.department = department;
    }
    
    // Filter by department code from student ID (e.g., CS, EC, RI, ME)
    if (departmentCode) {
      // First, try to find departments with this studentIdCode
      const deptWithCode = await Department.findOne({ 
        studentIdCode: departmentCode.toUpperCase(),
        isDeleted: { $ne: true }
      });
      
      if (deptWithCode) {
        // If found, also check by department ID
        filter.$or = [
          { department: deptWithCode.id },
          { studentID: new RegExp(`^[A-Z0-9]{5}${departmentCode.toUpperCase()}[A-Z0-9]*$`, 'i') }
        ];
      } else {
        // If no department found with this code, just search student IDs
        filter.studentID = new RegExp(`^[A-Z0-9]{5}${departmentCode.toUpperCase()}[A-Z0-9]*$`, 'i');
      }
    }
    
    if (studentID) filter.studentID = studentID;
    if (name) filter.name = new RegExp(name, 'i');
    if (email) filter.email = new RegExp(email, 'i');
    if (q) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { studentID: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
      );
    }
    
    // Pagination calculations
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);
    
    // Build sort object
    let sortObject = {};
    const sortOrderNum = sortOrder === 'asc' ? 1 : -1;
    
    if (sortBy === 'studentID') {
      // Sort by student ID alphabetically/numerically
      sortObject = { studentID: sortOrderNum };
    } else if (sortBy === 'year') {
      // For year sorting, we need to extract year and sort by it
      // We'll use aggregation pipeline to extract and sort by year
      const studentsAggregate = await User.aggregate([
        { $match: filter },
        {
          $addFields: {
            yearFromId: {
              $cond: {
                if: { $gte: [{ $strLenCP: '$studentID' }, 5] },
                then: {
                  $toInt: {
                    $substr: ['$studentID', 3, 2]
                  }
                },
                else: 999 // Put invalid IDs at end
              }
            }
          }
        },
        { $sort: { yearFromId: sortOrderNum, studentID: sortOrderNum } },
        { $skip: skip },
        { $limit: limitNum },
        { $project: { yearFromId: 0 } }
      ]);
      
      const studentIds = studentsAggregate.map(s => s._id);
      const students = await User.find({ _id: { $in: studentIds } })
        .select('-password');
      
      // Maintain sort order from aggregation
      const studentsMap = new Map(students.map(s => [s._id.toString(), s]));
      const sortedStudents = studentIds.map(id => studentsMap.get(id.toString())).filter(Boolean);
      
      // Add departmentName to each student
      const studentsWithDeptName = sortedStudents.map(student => ({
        ...student.toObject(),
        departmentName: getDepartmentName(student.department) || student.department
      }));
      
      return res.json({
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
    } else {
      // Default: sort by createdAt
      sortObject = { createdAt: sortOrderNum };
    }
    
    // Get paginated students
    const students = await User.find(filter)
      .select('-password')
      .sort(sortObject)
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
    console.error('Error listing students:', err);
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


