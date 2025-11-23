const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');
const User = require('../models/User');
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

// Save push notification token (for students)
router.post('/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!pushToken) {
      console.error('❌ Push token is required but not provided');
      return res.status(400).json({ message: 'Push token is required' });
    }

    if (!userId) {
      console.error('❌ User ID not found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`📱 Saving push token for user: ${userId}`);
    console.log(`📱 Token preview: ${pushToken.substring(0, 30)}...`);

    // Update user's push token
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        pushToken: pushToken,
        pushTokenUpdatedAt: new Date()
      },
      { new: true }
    ).select('name studentID email pushToken pushTokenUpdatedAt');

    if (!updatedUser) {
      console.error(`❌ User not found with ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ Push token saved for user: ${updatedUser.name || updatedUser.studentID || updatedUser.email || userId}`);
    console.log(`✅ Token saved at: ${updatedUser.pushTokenUpdatedAt}`);
    console.log(`✅ Has push token: ${!!updatedUser.pushToken}`);

    res.json({ 
      message: 'Push token saved successfully',
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        studentID: updatedUser.studentID,
        email: updatedUser.email,
        hasPushToken: !!updatedUser.pushToken,
        pushTokenUpdatedAt: updatedUser.pushTokenUpdatedAt
      }
    });
  } catch (err) {
    console.error('❌ Error saving push token:', err);
    console.error('❌ Error stack:', err.stack);
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


