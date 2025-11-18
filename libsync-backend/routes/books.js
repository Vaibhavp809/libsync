const express = require("express");
const router = express.Router();
const multer = require("multer");
const verifyToken = require("../middleware/auth");
const verifyAdmin = require("../middleware/adminAuth");
const { verifyStudentOrAdmin } = require("../middleware/studentAuth");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

const {
  addBook,
  getBooks,
  getBookById,
  updateBook,
  updateBookStatus,
  verifyBook,
  resetVerification,
  bulkResetVerification,
  resetAllVerification,
  getCountToReset,
  searchBooks,
  deleteBook,
  bulkImportBooks,
  getBookStatistics
} = require("../controllers/bookController");

// 📚 Existing routes with authentication
router.post("/", verifyToken, addBook);
router.post("/bulk-import", verifyToken, upload.single('file'), bulkImportBooks);
router.get("/", verifyStudentOrAdmin, getBooks);
router.get("/statistics", verifyStudentOrAdmin, getBookStatistics);
router.get("/search", verifyStudentOrAdmin, searchBooks);
// IMPORTANT: Specific routes must come before parameterized routes (/:id)
router.get("/count-to-reset", verifyToken, verifyAdmin, getCountToReset);
router.put("/bulk-reset", verifyToken, verifyAdmin, bulkResetVerification);
router.put("/reset-all", verifyToken, verifyAdmin, resetAllVerification);
router.get("/:id", verifyStudentOrAdmin, getBookById);
router.put("/:id", verifyToken, updateBook);
router.put("/:id/status", verifyToken, updateBookStatus);
router.put("/:id/verify", verifyToken, verifyBook);
router.put("/:id/reset-verification", verifyToken, verifyAdmin, resetVerification);
router.delete("/:id", verifyToken, deleteBook);

// 📘 NEW: Search accession numbers for autocomplete
router.get("/search-accession/:partial", verifyStudentOrAdmin, async (req, res) => {
  try {
    const Book = require("../models/Book");
    const { partial } = req.params;
    
    if (!partial || partial.length === 0) {
      return res.json([]);
    }
    
    // Pad the partial input to 6 digits for searching
    const paddedPartial = partial.padStart(6, '0');
    
    // Find books where accession number starts with the padded partial
    const books = await Book.find({
      accessionNumber: { $regex: `^${paddedPartial}`, $options: 'i' }
    })
    .select('accessionNumber title author status available')
    .limit(10)
    .sort({ accessionNumber: 1 });
    
    res.json(books);
  } catch (err) {
    console.error('Error searching accession numbers:', err);
    res.status(500).json({ message: err.message });
  }
});

// 📘 NEW: Get book by accession number
router.get("/accession/:accessionNumber", verifyStudentOrAdmin, async (req, res) => {
  try {
    const Book = require("../models/Book");
    let accessionNumber = req.params.accessionNumber;
    
    // Pad accession number to 6 digits with leading zeros if needed
    if (!isNaN(accessionNumber)) {
      accessionNumber = accessionNumber.toString().padStart(6, '0');
    }
    
    const book = await Book.findOne({ accessionNumber: accessionNumber });

    if (!book) {
      return res.status(404).json({ message: "Book not found with accession number: " + accessionNumber });
    }

    res.json(book);
  } catch (err) {
    console.error("Error fetching book by accession number:", err);
    res.status(500).send("Server error");
  }
});

// Get newest books
router.get("/new/list", verifyStudentOrAdmin, async (req, res) => {
  try {
    const books = await require("../models/Book")
      .find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
