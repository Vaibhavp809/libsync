const Book = require("../models/Book");

// Add or update a book
exports.addBook = async (req, res) => {
  try {
    const { accessionNumber, title, author, publisher, yearOfPublishing, edition, category, price } = req.body;
    
    // Validate required fields
    if (!accessionNumber || !title || !author || !publisher || !yearOfPublishing || !edition || !category || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    const newBook = new Book({ 
      accessionNumber, 
      title, 
      author, 
      publisher, 
      yearOfPublishing: parseInt(yearOfPublishing),
      edition, 
      category, 
      price: parseFloat(price)
    });
    
    await newBook.save();
    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (err) {
    console.error('Error adding book:', err);
    if (err.code === 11000) {
      res.status(400).json({ message: "Accession number already exists" });
    } else {
      res.status(500).json({ message: err.message });
    }
  }
};

// Delete a book
exports.deleteBook = async (req, res) => {
  try {
    console.log('Attempting to delete book:', req.params.id);
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      console.log('Book not found for deletion:', req.params.id);
      return res.status(404).json({ message: "Book not found" });
    }
    console.log('Book deleted successfully:', req.params.id);
    res.json({ message: "Book deleted successfully", book });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { accessionNumber, title, author, publisher, yearOfPublishing, edition, category, price } = req.body;
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Update fields if provided
    if (accessionNumber && accessionNumber !== book.accessionNumber) {
      // Check if new accession number already exists
      const existingBook = await Book.findOne({ accessionNumber, _id: { $ne: req.params.id } });
      if (existingBook) {
        return res.status(400).json({ message: "Accession number already exists" });
      }
      book.accessionNumber = accessionNumber;
    }
    
    if (title) book.title = title;
    if (author) book.author = author;
    if (publisher) book.publisher = publisher;
    if (yearOfPublishing) book.yearOfPublishing = parseInt(yearOfPublishing);
    if (edition) book.edition = edition;
    if (category) book.category = category;
    if (price) book.price = parseFloat(price);
    
    await book.save();
    res.json({ message: "Book updated successfully", book });
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateBookStatus = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    book.status = req.body.status || book.status;
    book.available = req.body.status === 'Available';
    await book.save();
    res.json({ message: "Book status updated", book });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    book.verified = true;
    await book.save();
    res.json({ message: "Book verified successfully", book });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchBooks = async (req, res) => {
  const query = req.query.q || req.query.query;
  try {
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    const books = await Book.find({
      $or: [
        { accessionNumber: { $regex: query, $options: "i" } },
        { title: { $regex: query, $options: "i" } },
        { author: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { publisher: { $regex: query, $options: "i" } }
      ]
    });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
