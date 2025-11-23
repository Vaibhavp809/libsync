const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');
const {
  getPushNotificationLogs,
  getPushNotificationLogById,
  getPushNotificationStats
} = require('../controllers/pushNotificationLogController');

// All routes require admin authentication
router.get('/', verifyToken, verifyAdmin, getPushNotificationLogs);
router.get('/stats', verifyToken, verifyAdmin, getPushNotificationStats);
router.get('/:id', verifyToken, verifyAdmin, getPushNotificationLogById);

module.exports = router;

