const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { createNotification, listNotifications } = require('../controllers/notificationController');

router.use(verifyToken);

router.post('/', createNotification);
router.get('/', listNotifications);

module.exports = router;


