const Book = require("../models/Book");
const XLSX = require('xlsx');

// Helper function to normalize accession number (pad to 6 digits with leading zeros)
const normalizeAccessionNumber = (accessionNumber) => {
  if (!accessionNumber) return '';
  
  const str = String(accessionNumber).trim();
  // Extract numeric part
  const numericPart = str.replace(/\D/g, '');
  
  if (!numericPart) {
    // If no numeric part found, return as-is (might be alphanumeric)
    return str;
  }
  
  // Pad to 6 digits with leading zeros
  return numericPart.padStart(6, '0');
};

// Add or update a book
exports.addBook = async (req, res) => {
  try {
    const { accessionNumber, title, author, publisher, yearOfPublishing, edition, category, price } = req.body;
    
    // Validate required fields
    if (!accessionNumber || !title || !author || !publisher || !yearOfPublishing || !edition || !category || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Normalize accession number (pad to 6 digits)
    const normalizedAccessionNumber = normalizeAccessionNumber(accessionNumber);
    
    const newBook = new Book({ 
      accessionNumber: normalizedAccessionNumber, 
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

// Add multiple copies of the same book with consecutive accession numbers
exports.addMultipleBooks = async (req, res) => {
  try {
    const { 
      startingAccessionNumber, 
      numberOfCopies, 
      title, 
      author, 
      publisher, 
      yearOfPublishing, 
      edition, 
      category, 
      price 
    } = req.body;
    
    // Validate required fields
    if (!startingAccessionNumber || !numberOfCopies || !title || !author || !publisher || !yearOfPublishing || !edition || !category || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Validate number of copies
    const copies = parseInt(numberOfCopies);
    if (isNaN(copies) || copies < 1 || copies > 100) {
      return res.status(400).json({ message: "Number of copies must be between 1 and 100" });
    }
    
    // Normalize starting accession number (pad to 6 digits)
    const startingAccStr = String(startingAccessionNumber).trim();
    
    // Extract numeric part for comparison
    const numericPart = startingAccStr.replace(/\D/g, '');
    if (!numericPart) {
      return res.status(400).json({ message: "Invalid accession number format" });
    }
    
    let startNum = parseInt(numericPart);
    const normalizedStartingAcc = normalizeAccessionNumber(startingAccessionNumber);
    
    // Check if the starting accession number exists (try both padded and unpadded versions)
    let existingBook = await Book.findOne({ 
      $or: [
        { accessionNumber: startingAccStr },
        { accessionNumber: normalizedStartingAcc },
        { accessionNumber: String(startNum) }
      ]
    });
    
    if (existingBook) {
      // If book exists at starting number, find the highest accession number 
      // by extracting numeric values from all accession numbers and finding the max
      const allBooks = await Book.find({}).select('accessionNumber').lean();
      
      let maxNum = startNum - 1;
      
      for (const book of allBooks) {
        const accNum = book.accessionNumber;
        if (accNum) {
          const numeric = parseInt(String(accNum).replace(/\D/g, ''));
          if (!isNaN(numeric) && numeric >= startNum && numeric > maxNum) {
            maxNum = numeric;
          }
        }
      }
      
      // Start from the next number after the highest found
      startNum = maxNum + 1;
    }
    
    // Generate consecutive accession numbers (padded to 6 digits)
    const booksToCreate = [];
    const createdBooks = [];
    const errors = [];
    
    for (let i = 0; i < copies; i++) {
      const accNum = normalizeAccessionNumber(String(startNum + i));
      
      // Check if this accession number already exists
      const exists = await Book.findOne({ accessionNumber: accNum });
      if (exists) {
        errors.push({
          accessionNumber: accNum,
          error: "Accession number already exists"
        });
        continue;
      }
      
      booksToCreate.push({
        accessionNumber: accNum,
        title,
        author,
        publisher,
        yearOfPublishing: parseInt(yearOfPublishing),
        edition,
        category,
        price: parseFloat(price)
      });
    }
    
    // Insert all books
    if (booksToCreate.length > 0) {
      const insertedBooks = await Book.insertMany(booksToCreate, { ordered: false });
      createdBooks.push(...insertedBooks);
    }
    
    // Prepare response
    const response = {
      message: `Successfully created ${createdBooks.length} book${createdBooks.length !== 1 ? 's' : ''}`,
      books: createdBooks,
      summary: {
        requested: copies,
        created: createdBooks.length,
        failed: errors.length,
        startingAccessionNumber: createdBooks.length > 0 ? createdBooks[0].accessionNumber : null,
        endingAccessionNumber: createdBooks.length > 0 ? createdBooks[createdBooks.length - 1].accessionNumber : null
      }
    };
    
    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (${errors.length} failed due to duplicate accession numbers)`;
    }
    
    res.status(201).json(response);
  } catch (err) {
    console.error('Error adding multiple books:', err);
    if (err.code === 11000) {
      res.status(400).json({ message: "One or more accession numbers already exist" });
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
    // Extract pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const verified = req.query.verified; // 'true', 'false', or undefined
    const condition = req.query.condition; // 'Good', 'Damaged', 'Lost', or undefined
    const verificationFilter = req.query.verificationFilter; // 'all', 'verified', 'unverified', 'damaged', 'lost'
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};
    
    if (search) {
      // Normalize search query for accession number (try both padded and unpadded)
      const normalizedSearch = normalizeAccessionNumber(search);
      filter.$or = [
        { accessionNumber: { $regex: search, $options: 'i' } },
        ...(normalizedSearch !== search ? [{ accessionNumber: { $regex: normalizedSearch, $options: 'i' } }] : []),
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { publisher: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Handle verification filters
    if (verificationFilter) {
      if (verificationFilter === 'verified') {
        filter.verified = true;
      } else if (verificationFilter === 'unverified') {
        filter.verified = { $ne: true };
      } else if (verificationFilter === 'damaged') {
        filter.condition = 'Damaged';
      } else if (verificationFilter === 'lost') {
        filter.condition = 'Lost';
      }
      // 'all' means no filter
    } else {
      // Legacy support for individual verified/condition params
      if (verified !== undefined) {
        filter.verified = verified === 'true';
      }
      if (condition) {
        filter.condition = condition;
      }
    }

    // Get total count for pagination info
    const totalBooks = await Book.countDocuments(filter);
    const totalPages = Math.ceil(totalBooks / limit);

    // Get paginated books with custom sorting for accession numbers
    let sortQuery = {};
    
    if (sortBy === 'accessionNumber') {
      // For accession numbers, we want to sort numerically if they're numeric
      // First try to sort them as numbers, fallback to string sort
      const books = await Book.aggregate([
        { $match: filter },
        {
          $addFields: {
            accessionNumberNumeric: {
              $toInt: {
                $ifNull: [
                  { $toInt: "$accessionNumber" },
                  999999999 // Large number for non-numeric accession numbers
                ]
              }
            }
          }
        },
        {
          $sort: {
            accessionNumberNumeric: sortOrder,
            accessionNumber: sortOrder // Secondary sort for same numbers
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            accessionNumberNumeric: 0 // Remove the temporary field
          }
        }
      ]);
      
      // Return early for accession number sorting
      res.json({
        books,
        pagination: {
          currentPage: page,
          totalPages,
          totalBooks,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit
        }
      });
      return;
    } else {
      // Regular sorting for other fields
      sortQuery[sortBy] = sortOrder;
    }
    
    const books = await Book.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance when we don't need mongoose documents

    res.json({
      books,
      pagination: {
        currentPage: page,
        totalPages,
        totalBooks,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching books:', err);
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
      // Normalize the new accession number (pad to 6 digits)
      const normalizedAccessionNumber = normalizeAccessionNumber(accessionNumber);
      
      // Check if new accession number already exists
      const existingBook = await Book.findOne({ accessionNumber: normalizedAccessionNumber, _id: { $ne: req.params.id } });
      if (existingBook) {
        return res.status(400).json({ message: "Accession number already exists" });
      }
      book.accessionNumber = normalizedAccessionNumber;
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

// Reset book verification to unverified
exports.resetVerification = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;

    // Reset verification fields
    book.verified = false;
    book.condition = 'Good';
    book.lastVerifiedAt = null;

    // Add verification history entry
    const historyEntry = {
      status: 'reset-unverified',
      by: userId,
      at: new Date(),
      source: 'admin-reset'
    };

    book.verificationHistory.push(historyEntry);
    await book.save();

    res.json({ message: "Book reset to unverified successfully", book });
  } catch (err) {
    console.error('Error resetting verification:', err);
    res.status(500).json({ message: err.message });
  }
};

// Bulk reset verification for multiple books
exports.bulkResetVerification = async (req, res) => {
  try {
    const { ids, accessionNumbers } = req.body;
    
    if (!ids && !accessionNumbers) {
      return res.status(400).json({ message: "ids or accessionNumbers are required" });
    }

    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;

    // Build query
    const query = {};
    if (ids && ids.length > 0) {
      query._id = { $in: ids };
    } else if (accessionNumbers && accessionNumbers.length > 0) {
      query.accessionNumber = { $in: accessionNumbers };
    }

    // Update books
    const result = await Book.updateMany(
      query,
      {
        $set: {
          verified: false,
          condition: 'Good',
          lastVerifiedAt: null
        },
        $push: {
          verificationHistory: {
            status: 'reset-unverified',
            by: userId,
            at: new Date(),
            source: 'admin-bulk-reset'
          }
        }
      }
    );

    res.json({
      message: `Reset ${result.modifiedCount} books to unverified`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error bulk resetting verification:', err);
    res.status(500).json({ message: err.message });
  }
};

// Reset all verified/damaged/lost books to unverified (global reset)
exports.resetAllVerification = async (req, res) => {
  const mongoose = require('mongoose');
  const StockImport = require('../models/StockImport');
  
  let session = null;
  try {
    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find all books that need to be reset (verified=true OR condition=Damaged OR condition=Lost)
    const booksToReset = await Book.find({
      $or: [
        { verified: true },
        { condition: 'Damaged' },
        { condition: 'Lost' }
      ]
    }).session(session).select('_id accessionNumber').limit(10000); // Limit to prevent memory issues

    const bookIds = booksToReset.map(book => book._id);
    const affectedCount = bookIds.length;

    if (affectedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({
        message: "No books to reset",
        updatedCount: 0,
        sample: []
      });
    }

    // Use bulkWrite for better performance with large datasets
    const resetTime = new Date();
    const bulkOps = bookIds.map(bookId => ({
      updateOne: {
        filter: { _id: bookId },
        update: {
          $set: {
            verified: false,
            condition: 'Good',
            lastVerifiedAt: null
          },
          $push: {
            verificationHistory: {
              status: 'reset-all-unverified',
              by: userId,
              at: resetTime,
              source: 'reset-all-button'
            }
          }
        }
      }
    }));

    // Process in batches of 1000 to avoid memory issues
    const BATCH_SIZE = 1000;
    let totalModified = 0;
    
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      const result = await Book.bulkWrite(batch, { session });
      totalModified += result.modifiedCount || batch.length;
    }

    // Create StockImport audit record for reset-all action
    const resetRecord = new StockImport({
      batchId: require('uuid').v4(),
      fileName: 'reset-all-button',
      uploadedBy: userId,
      uploadedAt: resetTime,
      totalRows: affectedCount,
      updatedCount: totalModified,
      notFoundCount: 0,
      errorCount: 0,
      action: 'reset-all',
      performedBy: userId,
      performedAt: resetTime,
      count: totalModified
    });
    
    await resetRecord.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Get sample of updated books for response
    const sample = booksToReset.slice(0, 10).map(book => ({
      accessionNumber: book.accessionNumber,
      _id: book._id
    }));

    console.log(`Reset-all complete: ${totalModified} books reset. Performed by user: ${userId}`);

    res.json({
      message: "Reset complete",
      updatedCount: totalModified,
      sample: sample
    });

  } catch (err) {
    // Abort transaction on error
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    
    console.error('Error resetting all verification:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get count of books that would be affected by reset-all
exports.getCountToReset = async (req, res) => {
  try {
    // Find books that need to be reset:
    // - verified is true, OR
    // - condition is 'Damaged', OR  
    // - condition is 'Lost'
    const query = {
      $or: [
        { verified: true },
        { condition: 'Damaged' },
        { condition: 'Lost' }
      ]
    };

    // Debug: Log the query and get breakdown
    const verifiedCount = await Book.countDocuments({ verified: true });
    const damagedCount = await Book.countDocuments({ condition: 'Damaged' });
    const lostCount = await Book.countDocuments({ condition: 'Lost' });
    const totalCount = await Book.countDocuments(query);

    console.log(`Count breakdown - Verified: ${verifiedCount}, Damaged: ${damagedCount}, Lost: ${lostCount}, Total to reset: ${totalCount}`);

    res.json({ count: totalCount });
  } catch (err) {
    console.error('Error getting count to reset:', err);
    res.status(500).json({ message: err.message, error: err.stack });
  }
};

exports.searchBooks = async (req, res) => {
  const query = req.query.q || req.query.query;
  try {
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    // Enhanced search with better relevance and performance
    const searchRegex = new RegExp(query.trim(), 'i');
    const normalizedQuery = normalizeAccessionNumber(query.trim());
    
    // First, get books that match exactly by accessionNumber (highest priority)
    // Try both the original query and normalized version
    const exactAccessionMatch = await Book.find({
      $or: [
        { accessionNumber: { $regex: `^${query.trim()}$`, $options: 'i' } },
        ...(normalizedQuery !== query.trim() ? [{ accessionNumber: { $regex: `^${normalizedQuery}$`, $options: 'i' } }] : [])
      ]
    }).limit(10);
    
    // Then, get books that start with the query in title (medium priority)
    const titleStartMatch = await Book.find({
      title: { $regex: `^${query.trim()}`, $options: 'i' },
      _id: { $nin: exactAccessionMatch.map(book => book._id) } // Exclude already matched
    }).limit(20);
    
    // Finally, get other matches (lowest priority)
    const otherMatches = await Book.find({
      $or: [
        { accessionNumber: searchRegex },
        { title: searchRegex },
        { author: searchRegex },
        { category: searchRegex },
        { publisher: searchRegex }
      ],
      _id: { $nin: [...exactAccessionMatch.map(book => book._id), ...titleStartMatch.map(book => book._id)] }
    })
    .sort({ title: 1 }) // Sort alphabetically by title for consistency
    .limit(70); // Remaining slots
    
    // Combine results with priority order
    const books = [...exactAccessionMatch, ...titleStartMatch, ...otherMatches];
    
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk import books from Excel/CSV file
exports.bulkImportBooks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let data;
    const buffer = req.file.buffer;
    
    // Parse Excel or CSV file
    if (req.file.mimetype === 'text/csv') {
      // Handle CSV
      const csvString = buffer.toString();
      const workbook = XLSX.read(csvString, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      // Handle Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "No data found in file" });
    }

    console.log(`Processing ${data.length} rows from uploaded file...`);

    const results = {
      totalRows: data.length,
      successful: 0,
      failed: 0,
      errors: [],
      duplicates: 0
    };

    const BATCH_SIZE = 100; // Process in batches to avoid memory issues
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const booksToInsert = [];

      for (const row of batch) {
        try {
          // Map common column names (case insensitive)
          const bookData = {
            accessionNumber: row['Accession Number'] || row['accessionNumber'] || row['ACCESSION NUMBER'] || row['Acc No'] || row['acc_no'],
            title: row['Title'] || row['title'] || row['TITLE'] || row['Book Title'] || row['book_title'],
            author: row['Author'] || row['author'] || row['AUTHOR'] || row['Authors'] || row['authors'],
            publisher: row['Publisher'] || row['publisher'] || row['PUBLISHER'],
            yearOfPublishing: parseInt(row['Year of Publishing'] || row['yearOfPublishing'] || row['YEAR'] || row['Year'] || row['year'] || row['Publication Year']),
            edition: row['Edition'] || row['edition'] || row['EDITION'] || row['Ed'] || row['ed'] || '1st Edition',
            category: row['Category'] || row['category'] || row['CATEGORY'] || row['Subject'] || row['subject'] || 'GENERAL',
            price: parseFloat(row['Price'] || row['price'] || row['PRICE'] || row['Cost'] || row['cost'] || 0)
          };

          // Validate required fields
          if (!bookData.accessionNumber || !bookData.title || !bookData.author || !bookData.publisher) {
            results.failed++;
            results.errors.push({
              row: i + batch.indexOf(row) + 2, // +2 for 1-based indexing and header row
              data: row,
              error: 'Missing required fields: accessionNumber, title, author, or publisher'
            });
            continue;
          }

          // Normalize accession number (pad to 6 digits)
          bookData.accessionNumber = normalizeAccessionNumber(bookData.accessionNumber);
          
          // Validate year
          if (isNaN(bookData.yearOfPublishing) || bookData.yearOfPublishing < 1000 || bookData.yearOfPublishing > new Date().getFullYear()) {
            bookData.yearOfPublishing = new Date().getFullYear(); // Default to current year
          }

          // Validate price
          if (isNaN(bookData.price) || bookData.price < 0) {
            bookData.price = 0;
          }

          booksToInsert.push(bookData);
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + batch.indexOf(row) + 2,
            data: row,
            error: error.message
          });
        }
      }

      // Batch insert books
      if (booksToInsert.length > 0) {
        try {
          const insertResult = await Book.insertMany(booksToInsert, { 
            ordered: false, // Continue inserting even if some fail
            rawResult: true 
          });
          results.successful += insertResult.insertedCount || booksToInsert.length;
        } catch (error) {
          // Handle duplicate key errors and other bulk insert errors
          if (error.writeErrors) {
            for (const writeError of error.writeErrors) {
              if (writeError.err.code === 11000) {
                results.duplicates++;
              } else {
                results.failed++;
                results.errors.push({
                  row: i + writeError.index + 2,
                  data: booksToInsert[writeError.index],
                  error: writeError.err.errmsg || writeError.err.message
                });
              }
            }
            // Count successful inserts from this batch
            const successfulInBatch = booksToInsert.length - error.writeErrors.length;
            results.successful += successfulInBatch;
          } else {
            // Handle other errors
            results.failed += booksToInsert.length;
            results.errors.push({
              batch: `Rows ${i + 2} to ${i + batch.length + 1}`,
              error: error.message
            });
          }
        }
      }

      // Log progress for large imports
      if (data.length > 1000 && (i + BATCH_SIZE) % 1000 === 0) {
        console.log(`Processed ${i + BATCH_SIZE} / ${data.length} rows...`);
      }
    }

    // Final results
    console.log('Import completed:', results);

    res.json({
      message: `Import completed. ${results.successful} books imported successfully.`,
      summary: {
        totalRows: results.totalRows,
        successful: results.successful,
        failed: results.failed,
        duplicates: results.duplicates,
        hasErrors: results.errors.length > 0
      },
      errors: results.errors.slice(0, 50) // Limit error details to first 50 for response size
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ 
      message: "Bulk import failed", 
      error: error.message 
    });
  }
};

// Get book statistics (optimized for dashboard)
exports.getBookStatistics = async (req, res) => {
  try {
    // Use aggregation pipeline for efficient statistics calculation
    const stats = await Book.aggregate([
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ],
          verificationCounts: [
            {
              $group: {
                _id: "$verified",
                count: { $sum: 1 }
              }
            }
          ],
          categoryCounts: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          recentBooks: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                title: 1,
                author: 1,
                accessionNumber: 1,
                createdAt: 1
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    // Format the response
    const formattedStats = {
      totalBooks: result.totalCount[0]?.count || 0,
      availableBooks: 0,
      issuedBooks: 0,
      reservedBooks: 0,
      verifiedBooks: 0,
      categories: result.categoryCounts,
      recentBooks: result.recentBooks
    };

    // Process status counts
    result.statusCounts.forEach(status => {
      switch (status._id) {
        case 'Available':
          formattedStats.availableBooks = status.count;
          break;
        case 'Issued':
          formattedStats.issuedBooks = status.count;
          break;
        case 'Reserved':
          formattedStats.reservedBooks = status.count;
          break;
      }
    });
    
    // Process verification counts
    result.verificationCounts.forEach(verification => {
      if (verification._id === true) {
        formattedStats.verifiedBooks = verification.count;
      }
    });

    res.json(formattedStats);
  } catch (err) {
    console.error('Error getting book statistics:', err);
    res.status(500).json({ message: err.message });
  }
};
