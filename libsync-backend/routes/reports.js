const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { attendanceCsv, loansCsv } = require('../controllers/reportController');

router.use(verifyToken);

router.get('/attendance', attendanceCsv);
router.get('/loans', loansCsv);

module.exports = router;


