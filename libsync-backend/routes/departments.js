const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');

/**
 * GET /api/departments
 * Returns list of all available departments
 * Public endpoint (can be accessed without authentication)
 */
router.get('/', getDepartments);

/**
 * POST /api/departments
 * Create a new department (Admin only)
 */
router.post('/', verifyToken, verifyAdmin, createDepartment);

/**
 * PUT /api/departments/:id
 * Update a department (Admin only)
 */
router.put('/:id', verifyToken, verifyAdmin, updateDepartment);

/**
 * DELETE /api/departments/:id
 * Delete a department (Admin only)
 */
router.delete('/:id', verifyToken, verifyAdmin, (req, res, next) => {
  console.log('DELETE route hit - params:', req.params);
  next();
}, deleteDepartment);

module.exports = router;

