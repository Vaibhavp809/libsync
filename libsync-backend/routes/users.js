const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/userController');

router.use(verifyToken);

router.get('/', listStudents);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;


