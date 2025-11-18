const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingController');

router.use(verifyToken);

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;


