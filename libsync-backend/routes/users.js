const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');
const {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  resetPassword,
} = require('../controllers/userController');

router.use(verifyToken);

// Search students by partial USN for autocomplete
router.get('/search-usn/:partial', async (req, res) => {
  try {
    const { partial } = req.params;
    
    if (!partial || partial.length < 2) {
      return res.json([]);
    }
    
    // Find students whose USN starts with or contains the partial string
    const students = await require('../models/User').find({
      studentID: { $regex: `^${partial}`, $options: 'i' },
      role: 'student'
    })
    .select('name studentID email department')
    .limit(10)
    .sort({ studentID: 1 });
    
    res.json(students);
  } catch (err) {
    console.error('Error searching students by USN:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get student details by USN/studentID with active loans (must be before generic routes)
router.get('/student/:studentID', async (req, res) => {
  try {
    const { studentID } = req.params;
    
    // Find student by studentID
    const student = await require('../models/User').findOne({ 
      studentID: studentID,
      role: 'student' 
    });
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Get active loans for this student
    const activeLoans = await require('../models/Loan').find({ 
      student: student._id, 
      status: 'Issued' 
    }).populate('book', 'title author accessionNumber');
    
    res.json({ 
      student: {
        _id: student._id,
        name: student.name,
        studentID: student.studentID,
        email: student.email,
        department: student.department || 'N/A'
      },
      activeLoans: activeLoans || [],
      activeLoanCount: activeLoans.length
    });
  } catch (err) {
    console.error('Error fetching student details:', err);
    res.status(500).json({ message: err.message });
  }
});

// Generic user routes (must be after specific routes)
router.get('/', listStudents);
router.post('/', verifyAdmin, createStudent); // Only admins can create students
router.put('/:id', verifyAdmin, updateStudent); // Only admins can update students
router.put('/:id/reset-password', verifyAdmin, resetPassword); // Password reset endpoint (admin only)
router.delete('/:id', verifyAdmin, deleteStudent); // Only admins can delete students

module.exports = router;


