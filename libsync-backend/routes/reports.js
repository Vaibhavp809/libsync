const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');
const { attendanceCsv, loansCsv, stockVerificationExcel } = require('../controllers/reportController');

router.use(verifyToken);

router.get('/attendance', attendanceCsv);
router.get('/loans', loansCsv);
router.get('/stock-verification', verifyAdmin, stockVerificationExcel);

module.exports = router;


