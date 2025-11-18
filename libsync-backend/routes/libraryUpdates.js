const express = require('express');
const router = express.Router();
const libraryUpdateController = require('../controllers/libraryUpdateController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const studentAuth = require('../middleware/studentAuth');

// Admin routes (require admin authentication) - specific routes first
router.get('/admin/statistics', auth, adminAuth, libraryUpdateController.getStatistics);
router.delete('/admin/cleanup', auth, adminAuth, libraryUpdateController.cleanupExpired);
router.get('/admin', auth, adminAuth, libraryUpdateController.getAllUpdatesAdmin);
router.post('/admin', auth, adminAuth, libraryUpdateController.createUpdate);
router.put('/admin/:id', auth, adminAuth, libraryUpdateController.updateUpdate);
router.delete('/admin/:id', auth, adminAuth, libraryUpdateController.deleteUpdate);
router.patch('/admin/:id/pin', auth, adminAuth, libraryUpdateController.togglePin);

// Public routes (for students and general access)
router.get('/active', libraryUpdateController.getActiveUpdates);

// Default route - serves admin content if authenticated, otherwise redirect
router.get('/', async (req, res, next) => {
  // Check if user is authenticated and is admin
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      const user = await User.findById(decoded.id);
      if (user && user.role === 'admin') {
        return libraryUpdateController.getAllUpdatesAdmin(req, res);
      }
    }
    // For non-admin or unauthenticated users, return active updates
    return libraryUpdateController.getActiveUpdates(req, res);
  } catch (error) {
    return libraryUpdateController.getActiveUpdates(req, res);
  }
});

// Individual update route (must be last)
router.get('/:id', libraryUpdateController.getUpdateById);

module.exports = router;