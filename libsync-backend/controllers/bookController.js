const Book = require("../models/Book");
const XLSX = require('xlsx');

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
    // Extract pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { accessionNumber: { $regex: search, $options: 'i' } },
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

          // Convert accession number to string and trim
          bookData.accessionNumber = String(bookData.accessionNumber).trim();
          
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
