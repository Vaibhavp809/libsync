const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");

const {
  addBook,
  getBooks,
  getBookById,
  updateBookStatus,
  verifyBook,
  searchBooks
} = require("../controllers/bookController");

// 📚 Existing routes with authentication
router.post("/", verifyToken, addBook);
router.get("/", verifyToken, getBooks);
router.get("/search", verifyToken, searchBooks);
router.get("/:id", verifyToken, getBookById);
router.put("/:id/status", verifyToken, updateBookStatus);
router.put("/:id/verify", verifyToken, verifyBook);

// 📘 NEW: Get book by ISBN
router.get("/isbn/:isbn", verifyToken, async (req, res) => {
  try {
    const Book = require("../models/Book");
    const book = await Book.findOne({ isbn: req.params.isbn });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (err) {
    console.error("Error fetching book by ISBN:", err);
    res.status(500).send("Server error");
  }
});
router.get("/new", verifyToken, async (req, res) => {
  try {
    const books = await require("../models/Book")
      .find()
      .sort({ addedOn: -1 })
      .limit(10);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
