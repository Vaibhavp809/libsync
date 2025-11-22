const Book = require("../models/Book");
const StockImport = require("../models/StockImport");
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Normalize accession number to 6 digits by left-padding with zeros
 * Example: "1" -> "000001", "123" -> "000123", "000045" -> "000045"
 */
function normalizeAccessionNumber(accessionNumber) {
  if (!accessionNumber) return null;
  
  // Convert to string and trim
  let normalized = String(accessionNumber).trim();
  
  // Remove all non-digit characters (but keep leading zeros)
  normalized = normalized.replace(/[^\d]/g, '');
  
  // If empty after cleaning, return null
  if (!normalized) return null;
  
  // Left-pad to 6 digits
  normalized = normalized.padStart(6, '0');
  
  return normalized;
}

/**
 * Normalize status string to standard values
 */
function normalizeStatus(status) {
  if (!status) return 'Verified'; // Default to Verified if no status provided
  
  const statusStr = String(status).trim().toLowerCase();
  
  if (statusStr.includes('verified') || statusStr === 'v') {
    return 'Verified';
  } else if (statusStr.includes('damaged') || statusStr === 'd') {
    return 'Damaged';
  } else if (statusStr.includes('lost') || statusStr === 'l') {
    return 'Lost';
  }
  
  // Default to Verified
  return 'Verified';
}

/**
 * Find accession number column in parsed data
 */
function findAccessionColumn(row) {
  const keys = Object.keys(row);
  const accessionPatterns = [
    /accession/i,
    /acc/i,
    /accessionno/i,
    /accession_number/i,
    /a/i // Single letter A
  ];
  
  for (const key of keys) {
    for (const pattern of accessionPatterns) {
      if (pattern.test(key)) {
        return key;
      }
    }
  }
  
  // Default to first column if no match
  return keys[0] || null;
}

/**
 * Find status column in parsed data
 */
function findStatusColumn(row) {
  const keys = Object.keys(row);
  const statusPatterns = [
    /status/i,
    /condition/i,
    /state/i,
    /verification/i
  ];
  
  for (const key of keys) {
    for (const pattern of statusPatterns) {
      if (pattern.test(key)) {
        return key;
      }
    }
  }
  
  return null;
}

/**
 * Stock Import Controller
 * POST /api/stock/import
 * Accepts Excel/CSV file with accession numbers and optional status
 */
exports.importStock = async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "File size exceeds 5MB limit" });
    }

    let data;
    const buffer = req.file.buffer;
    
    // Parse Excel or CSV file
    try {
      if (req.file.mimetype === 'text/csv') {
        // Handle CSV
        const csvString = buffer.toString('utf8');
        const workbook = XLSX.read(csvString, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        // Handle Excel (.xlsx, .xls)
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }
    } catch (parseError) {
      return res.status(400).json({ 
        message: "Failed to parse file. Please ensure it's a valid Excel or CSV file.",
        error: parseError.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "No data found in file" });
    }

    console.log(`Processing ${data.length} rows from uploaded file: ${req.file.originalname}`);

    // Detect column names from first row
    const firstRow = data[0];
    const accessionColumn = findAccessionColumn(firstRow);
    const statusColumn = findStatusColumn(firstRow);

    if (!accessionColumn) {
      return res.status(400).json({ message: "Could not find accession number column in file" });
    }

    // Start transaction only after validation
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sessionError) {
      console.error('Failed to start transaction:', sessionError);
      return res.status(500).json({ 
        message: "Failed to start database transaction", 
        error: sessionError.message 
      });
    }

    // Process and normalize data
    const processedEntries = new Map(); // Use Map to de-duplicate by accession number
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const rawAccession = row[accessionColumn];
        if (!rawAccession) {
          errors.push({
            row: i + 2, // +2 for 1-based indexing and header row
            accessionNumber: null,
            error: 'Missing accession number'
          });
          continue;
        }

        // Normalize accession number
        const normalizedAccession = normalizeAccessionNumber(rawAccession);
        if (!normalizedAccession) {
          errors.push({
            row: i + 2,
            accessionNumber: String(rawAccession),
            error: 'Invalid accession number format'
          });
          continue;
        }

        // Get status (if column exists)
        const rawStatus = statusColumn ? row[statusColumn] : null;
        const status = normalizeStatus(rawStatus);

        // De-duplicate: if same accession appears multiple times, use the last one
        processedEntries.set(normalizedAccession, {
          accessionNumber: normalizedAccession,
          status: status,
          row: i + 2
        });
      } catch (error) {
        errors.push({
          row: i + 2,
          accessionNumber: row[accessionColumn] || 'unknown',
          error: error.message
        });
      }
    }

    // Convert Map to Array
    const entries = Array.from(processedEntries.values());
    console.log(`Processed ${entries.length} unique accession numbers (${data.length - entries.length} duplicates removed)`);

    // Process updates in transaction
    const results = {
      updated: [],
      notFound: [],
      errors: errors
    };

    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;
    const fileName = req.file.originalname;
    
    // Generate batchId for this import
    const batchId = uuidv4();
    const uploadedAt = new Date();

    // Process each entry
    for (const entry of entries) {
      try {
        const book = await Book.findOne({ accessionNumber: entry.accessionNumber }).session(session);
        
        if (!book) {
          results.notFound.push(entry.accessionNumber);
          continue;
        }

        // Determine updates based on status
        let updateData = {};
        
        if (entry.status === 'Verified') {
          updateData.verified = true;
          updateData.condition = 'Good';
        } else if (entry.status === 'Damaged') {
          updateData.verified = false;
          updateData.condition = 'Damaged';
        } else if (entry.status === 'Lost') {
          updateData.verified = false;
          updateData.condition = 'Lost';
        }

        // Set lastVerifiedAt to upload timestamp for consistency
        updateData.lastVerifiedAt = uploadedAt;

        // Add verification history entry with batchId in source
        const historyEntry = {
          status: entry.status,
          by: userId,
          at: uploadedAt,
          source: `${fileName} (batch: ${batchId})`
        };

        // Update book
        await Book.updateOne(
          { _id: book._id },
          {
            $set: updateData,
            $push: { verificationHistory: historyEntry }
          }
        ).session(session);

        results.updated.push({
          accessionNumber: entry.accessionNumber,
          status: entry.status
        });
      } catch (error) {
        results.errors.push({
          accessionNumber: entry.accessionNumber,
          error: error.message
        });
      }
    }

    // Create StockImport audit record
    const stockImportRecord = new StockImport({
      batchId: batchId,
      fileName: fileName,
      uploadedBy: userId,
      uploadedAt: uploadedAt,
      totalRows: entries.length,
      updatedCount: results.updated.length,
      notFoundCount: results.notFound.length,
      errorCount: results.errors.length,
      action: 'import'
    });
    
    await stockImportRecord.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`Import complete: ${results.updated.length} updated, ${results.notFound.length} not found, ${results.errors.length} errors. BatchId: ${batchId}`);

    res.json({
      message: "Import complete",
      batchId: batchId,
      results: {
        updated: results.updated,
        notFound: results.notFound,
        errors: results.errors
      },
      summary: {
        totalProcessed: entries.length,
        updated: results.updated.length,
        notFound: results.notFound.length,
        errors: results.errors.length
      }
    });

  } catch (error) {
    // Abort transaction on error (session is in outer scope)
    if (session) {
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        session.endSession();
      } catch (sessionError) {
        console.error('Error cleaning up session:', sessionError);
      }
    }
    
    console.error('Stock import error:', error);
    res.status(500).json({ 
      message: "Stock import failed", 
      error: error.message 
    });
  }
};

/**
 * Bulk Stock Import Controller (from single entry form)
 * POST /api/stock/import/bulk
 * Accepts array of accession numbers and status
 */
exports.importBulkStock = async (req, res) => {
  try {
    const { accessionNumbers, status } = req.body;

    // Validate input
    if (!accessionNumbers || !Array.isArray(accessionNumbers) || accessionNumbers.length === 0) {
      return res.status(400).json({ message: "Accession numbers array is required" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Validate status value
    const validStatuses = ['Verified', 'Damaged', 'Lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;
    const now = new Date();

    // Normalize all accession numbers
    const normalizedNumbers = accessionNumbers
      .map(acc => normalizeAccessionNumber(acc))
      .filter(acc => acc !== null);

    if (normalizedNumbers.length === 0) {
      return res.status(400).json({ message: "No valid accession numbers found" });
    }

    // Process each accession number
    const results = {
      updated: [],
      notFound: [],
      errors: []
    };

    for (const normalizedAcc of normalizedNumbers) {
      try {
        const book = await Book.findOne({ accessionNumber: normalizedAcc });
        
        if (!book) {
          results.notFound.push(normalizedAcc);
          continue;
        }

        // Determine updates based on status
        let updateData = {};
        
        if (status === 'Verified') {
          updateData.verified = true;
          updateData.condition = 'Good';
        } else if (status === 'Damaged') {
          updateData.verified = false;
          updateData.condition = 'Damaged';
        } else if (status === 'Lost') {
          updateData.verified = false;
          updateData.condition = 'Lost';
        }

        // Set lastVerifiedAt
        updateData.lastVerifiedAt = now;

        // Add verification history entry
        const historyEntry = {
          status: status,
          by: userId,
          at: now,
          source: 'bulk-import'
        };

        // Update book
        await Book.updateOne(
          { _id: book._id },
          {
            $set: updateData,
            $push: { verificationHistory: historyEntry }
          }
        );

        results.updated.push({
          accessionNumber: normalizedAcc,
          status: status
        });
      } catch (error) {
        results.errors.push({
          accessionNumber: normalizedAcc,
          error: error.message
        });
      }
    }

    console.log(`Bulk import complete: ${results.updated.length} updated, ${results.notFound.length} not found, ${results.errors.length} errors`);

    res.json({
      message: "Bulk import complete",
      results: results,
      summary: {
        totalProcessed: normalizedNumbers.length,
        updated: results.updated.length,
        notFound: results.notFound.length,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('Bulk stock import error:', error);
    res.status(500).json({ 
      message: "Bulk stock import failed", 
      error: error.message 
    });
  }
};

/**
 * Single Stock Import Controller
 * POST /api/stock/import/single
 * Accepts single accession number and status
 */
exports.importSingleStock = async (req, res) => {
  try {
    const { accessionNumber, status } = req.body;

    // Validate input
    if (!accessionNumber) {
      return res.status(400).json({ message: "Accession number is required" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Validate status value
    const validStatuses = ['Verified', 'Damaged', 'Lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Normalize accession number
    const normalizedAccession = normalizeAccessionNumber(accessionNumber);
    if (!normalizedAccession) {
      return res.status(400).json({ message: "Invalid accession number format" });
    }

    // Find book
    const book = await Book.findOne({ accessionNumber: normalizedAccession });
    
    if (!book) {
      return res.json({
        updated: null,
        notFound: normalizedAccession
      });
    }

    // Get user ID from request (set by auth middleware)
    const userId = req.user ? req.user._id || req.user.id : null;
    const now = new Date();

    // Determine updates based on status
    let updateData = {};
    
    if (status === 'Verified') {
      updateData.verified = true;
      updateData.condition = 'Good';
    } else if (status === 'Damaged') {
      updateData.verified = false;
      updateData.condition = 'Damaged';
    } else if (status === 'Lost') {
      updateData.verified = false;
      updateData.condition = 'Lost';
    }

    // Set lastVerifiedAt
    updateData.lastVerifiedAt = now;

    // Add verification history entry
    const historyEntry = {
      status: status,
      by: userId,
      at: now,
      source: 'single-import'
    };

    // Update book
    await Book.updateOne(
      { _id: book._id },
      {
        $set: updateData,
        $push: { verificationHistory: historyEntry }
      }
    );

    console.log(`Single import: Updated ${normalizedAccession} to ${status}`);

    res.json({
      updated: {
        accessionNumber: normalizedAccession,
        status: status
      },
      book: {
        _id: book._id,
        title: book.title,
        accessionNumber: normalizedAccession,
        verified: updateData.verified,
        condition: updateData.condition
      }
    });

  } catch (error) {
    console.error('Single stock import error:', error);
    res.status(500).json({ 
      message: "Single stock import failed", 
      error: error.message 
    });
  }
};

