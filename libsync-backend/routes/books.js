const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { verifyStudentOrAdmin } = require("../middleware/studentAuth");

const {
  addBook,
  getBooks,
  getBookById,
  updateBook,
  updateBookStatus,
  verifyBook,
  searchBooks,
  deleteBook
} = require("../controllers/bookController");

// 📚 Existing routes with authentication
router.post("/", verifyToken, addBook);
router.get("/", verifyStudentOrAdmin, getBooks);
router.get("/search", verifyStudentOrAdmin, searchBooks);
router.get("/:id", verifyStudentOrAdmin, getBookById);
router.put("/:id", verifyToken, updateBook);
router.put("/:id/status", verifyToken, updateBookStatus);
router.put("/:id/verify", verifyToken, verifyBook);
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
    const book = await Book.findOne({ accessionNumber: req.params.accessionNumber });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
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
