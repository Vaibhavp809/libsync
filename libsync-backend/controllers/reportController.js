const Attendance = require('../models/Attendance');
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const XLSX = require('xlsx');

const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  
  // Custom headers mapping
  const headerMapping = {
    date: 'Date',
    loginTime: 'Login Time (IST)',
    logoutTime: 'Logout Time (IST)',
    status: 'Status',
    studentName: 'Student Name',
    studentEmail: 'Email',
    studentID: 'Student ID',
    department: 'Department'
  };
  
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };
  
  const headerLine = headers.map(h => headerMapping[h] || h).join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

const formatToIST = (date) => {
  if (!date) return '';
  const d = new Date(date);
  
  // Use Intl.DateTimeFormat for reliable timezone conversion to IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Format returns parts in order: year, month, day, hour, minute
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  
  // Return in YYYY-MM-DD HH:mm format
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

exports.attendanceCsv = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query with optional date range filters
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    const records = await Attendance.find(query).populate('student').sort({ date: -1, loginTime: 1 });
    const rows = records.map(r => ({
      date: r.date ? formatToIST(r.date).split(' ')[0] : '',
      loginTime: formatToIST(r.loginTime),
      logoutTime: r.logoutTime ? formatToIST(r.logoutTime) : '',
      status: r.status,
      studentName: r.student?.name || '',
      studentEmail: r.student?.email || '',
      studentID: r.student?.studentID || '',
      department: r.student?.department || '',
    }));
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    
    // Generate filename with date range if provided
    let filename = 'attendance.csv';
    if (startDate && endDate) {
      filename = `attendance_${startDate}_to_${endDate}.csv`;
    } else if (startDate) {
      filename = `attendance_from_${startDate}.csv`;
    } else if (endDate) {
      filename = `attendance_until_${endDate}.csv`;
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loansCsv = async (req, res) => {
  try {
    const loans = await Loan.find().populate('book').populate('student').sort({ issueDate: -1 });
    const rows = loans.map(l => ({
      bookTitle: l.book?.title || '',
      accessionNumber: l.book?.accessionNumber || '',
      author: l.book?.author || '',
      studentName: l.student?.name || '',
      studentEmail: l.student?.email || '',
      studentID: l.student?.studentID || '',
      department: l.student?.department || '',
      issueDate: l.issueDate ? formatToIST(l.issueDate) : '',
      dueDate: l.dueDate ? formatToIST(l.dueDate) : '',
      returnDate: l.returnDate ? formatToIST(l.returnDate) : '',
      status: l.status,
      fine: l.fine || 0,
    }));
    
    // Custom headers for loans CSV
    const headerMapping = {
      bookTitle: 'Book Title',
      accessionNumber: 'Accession Number',
      author: 'Author',
      studentName: 'Student Name',
      studentEmail: 'Email',
      studentID: 'Student ID',
      department: 'Department',
      issueDate: 'Issue Date (IST)',
      dueDate: 'Due Date (IST)',
      returnDate: 'Return Date (IST)',
      status: 'Status',
      fine: 'Fine (₹)'
    };
    
    if (!rows || rows.length === 0) {
      const csv = Object.values(headerMapping).join(',') + '\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="loans.csv"');
      res.status(200).send(csv);
      return;
    }
    
    const headers = Object.keys(rows[0]);
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };
    
    const headerLine = headers.map(h => headerMapping[h] || h).join(',');
    const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
    const csv = [headerLine, ...dataLines].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="loans.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error('Error generating loans CSV:', err);
    res.status(500).json({ message: err.message });
  }
};

// Stock Verification Excel Export
exports.stockVerificationExcel = async (req, res) => {
  try {
    const { start, end, type, batchId } = req.query;
    
    // Build filter
    const filter = {};
    
    // Apply type filter
    if (type && type !== 'All') {
      if (type === 'Verified') {
        filter.verified = true;
      } else if (type === 'Unverified') {
        filter.verified = { $ne: true };
      } else if (type === 'Damaged') {
        filter.condition = 'Damaged';
      } else if (type === 'Lost') {
        filter.condition = 'Lost';
      }
    }
    
    // Apply batchId filter if provided (search in verificationHistory source)
    // This should only show books that have verification history entries from this specific batch
    if (batchId) {
      // Match books where at least one verificationHistory entry has this batchId
      filter['verificationHistory'] = {
        $elemMatch: {
          source: { $regex: batchId, $options: 'i' }
        }
      };
    }
    
    // Apply date filter if provided (filter by lastVerifiedAt)
    // Note: For unverified books, lastVerifiedAt may be null, so we only apply date filter if type is not Unverified
    if ((start || end) && type !== 'Unverified') {
      if (!filter.lastVerifiedAt) {
        filter.lastVerifiedAt = {};
      }
      if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        filter.lastVerifiedAt.$gte = startDate;
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filter.lastVerifiedAt.$lte = endDate;
      }
      // Ensure lastVerifiedAt exists (not null) when date filter is applied
      filter.lastVerifiedAt.$exists = true;
    }
    
    // Fetch books with populated user data for verification history
    const books = await Book.find(filter)
      .populate('verificationHistory.by', 'name email')
      .sort({ accessionNumber: 1 });
    
    // Prepare data for Excel
    const rows = books.map(book => {
      // Get last verification entry
      const lastVerification = book.verificationHistory && book.verificationHistory.length > 0
        ? book.verificationHistory[book.verificationHistory.length - 1]
        : null;
      
      // Extract batchId from source if present
      let extractedBatchId = '';
      if (lastVerification?.source) {
        const batchMatch = lastVerification.source.match(/batch:\s*([a-f0-9-]+)/i);
        if (batchMatch) {
          extractedBatchId = batchMatch[1];
        }
      }
      
      // Format lastVerifiedAt in IST (YYYY-MM-DD HH:mm format)
      const lastVerifiedAtFormatted = book.lastVerifiedAt
        ? formatToIST(book.lastVerifiedAt)
        : '';
      
      // Get last verified by name/email
      const lastVerifiedBy = lastVerification?.by
        ? (lastVerification.by.name || lastVerification.by.email || '')
        : '';
      
      // Get last verification source (without batchId for cleaner display)
      const lastSource = lastVerification?.source 
        ? lastVerification.source.replace(/\s*\(batch:[^)]+\)/i, '').trim()
        : '';
      
      // Format verification history as JSON string
      const verificationHistoryStr = book.verificationHistory && book.verificationHistory.length > 0
        ? JSON.stringify(book.verificationHistory.map(entry => ({
            status: entry.status,
            by: entry.by?.name || entry.by?.email || entry.by?.toString() || '',
            at: entry.at ? formatToIST(entry.at) : '',
            source: entry.source || ''
          })))
        : '';
      
      return {
        'AccessionNumber': book.accessionNumber || '',
        'Title': book.title || '',
        'Author': book.author || '',
        'Condition': book.condition || 'Good',
        'Verified': book.verified ? 'Yes' : 'No',
        'LastVerifiedAt': lastVerifiedAtFormatted,
        'LastVerifiedBy': lastVerifiedBy,
        'LastVerificationSource': lastSource,
        'BatchId': extractedBatchId,
        'VerificationHistory': verificationHistoryStr
      };
    });
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Verification');
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // AccessionNumber
      { wch: 30 }, // Title
      { wch: 25 }, // Author
      { wch: 12 }, // Condition
      { wch: 10 }, // Verified
      { wch: 20 }, // LastVerifiedAt
      { wch: 25 }, // LastVerifiedBy
      { wch: 25 }, // LastVerificationSource
      { wch: 40 }, // BatchId
      { wch: 50 }  // VerificationHistory
    ];
    worksheet['!cols'] = colWidths;
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Generate filename with timestamp and filters
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    
    let filename = 'LibSync_StockVerification_report';
    
    // Add type to filename
    if (type && type !== 'All') {
      filename += `_${type.toLowerCase()}`;
    } else {
      filename += '_all';
    }
    
    // Add batchId prefix if provided
    if (batchId) {
      const shortBatchId = batchId.substring(0, 8); // Use first 8 chars for filename
      filename = `LibSync_StockVerification_report_batch_${shortBatchId}_${type && type !== 'All' ? type.toLowerCase() : 'all'}`;
    }
    
    // Add date range to filename if provided
    if (start && end) {
      const startStr = start.replace(/-/g, '');
      const endStr = end.replace(/-/g, '');
      filename += `_${startStr}_to_${endStr}`;
    } else if (start) {
      const startStr = start.replace(/-/g, '');
      filename += `_from_${startStr}`;
    } else if (end) {
      const endStr = end.replace(/-/g, '');
      filename += `_until_${endStr}`;
    }
    
    // Add timestamp
    filename += `_${timestamp}.xlsx`;
    
    // Set headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Error generating stock verification report:', err);
    res.status(500).json({ message: err.message });
  }
};


