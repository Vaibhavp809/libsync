const express = require("express");
const router = express.Router();
const multer = require("multer");
const verifyToken = require("../middleware/auth");
const verifyAdmin = require("../middleware/adminAuth");
const { importStock, importSingleStock } = require("../controllers/stockController");
const StockImport = require("../models/StockImport");

// Configure multer for file uploads (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

/**
 * POST /api/stock/import
 * Import stock verification data from Excel/CSV file
 * Requires admin authentication
 * 
 * File format:
 * - Single column: AccessionNo (or similar)
 * - Two columns: AccessionNo, Status (Verified/Damaged/Lost)
 * 
 * Accession numbers are automatically normalized to 6 digits (left-padded with zeros)
 */
router.post("/import", verifyToken, verifyAdmin, upload.single('file'), importStock);

/**
 * POST /api/stock/import/single
 * Import a single stock verification entry
 * Requires admin authentication
 * 
 * Body: { accessionNumber: "<value>", status: "<status>" }
 * Status: Verified / Damaged / Lost
 */
router.post("/import/single", verifyToken, verifyAdmin, importSingleStock);

/**
 * GET /api/stock-imports/latest
 * Get latest stock import record
 * Requires admin authentication
 */
router.get("/imports/latest", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const latest = await StockImport.findOne()
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name email')
      .populate('performedBy', 'name email')
      .lean();
    
    if (!latest) {
      return res.json({
        message: "No stock imports found",
        data: null
      });
    }
    
    res.json({
      message: "Latest stock import retrieved",
      data: latest
    });
  } catch (err) {
    console.error('Error getting latest stock import:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;



