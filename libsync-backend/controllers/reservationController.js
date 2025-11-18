
const mongoose = require('mongoose');
const Reservation = require("../models/Reservation");
const Book = require("../models/Book");

// Reserve a book
exports.reserveBook = async (req, res) => {
  try {
    const { bookId, studentId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (!book.available) {
      return res.status(400).json({ message: "Book is not available for reservation" });
    }
    // Optionally, check if already reserved
    const existing = await Reservation.findOne({ book: bookId, status: "Active" });
    if (existing) {
      return res.status(400).json({ message: "Book is already reserved" });
    }
    const reservation = new Reservation({ book: bookId, student: studentId });
    await reservation.save();
    
    // Update book status
    book.status = "Reserved";
    book.available = false;
    await book.save();
    res.status(201).json({ message: "Book reserved successfully", reservation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel a reservation
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('book');
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    // Update reservation status
    reservation.status = "Cancelled";
    await reservation.save();
    
    // Restore book availability if it was reserved
    if (reservation.book && reservation.book.status === 'Reserved') {
      reservation.book.status = 'Available';
      reservation.book.available = true;
      await reservation.book.save();
    }
    
    res.json({ message: "Reservation cancelled", reservation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all reservations for a student
exports.getStudentReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ student: req.params.studentId })
      .populate("book")
      .populate("student");
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fulfill a reservation
exports.fulfillReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('book')
      .populate('student');

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    if (reservation.status !== 'Active') {
      return res.status(400).json({ message: "Reservation is not active" });
    }

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if there are any other active or fulfilled reservations for this book
      const otherReservations = await Reservation.find({
        book: reservation.book._id,
        _id: { $ne: reservation._id },
        status: { $in: ['Active', 'Fulfilled'] }
      }).session(session);

      if (otherReservations.length > 0) {
        // Abort transaction and return a structured 400 so client gets a meaningful error
        await session.abortTransaction();
        session.endSession();
        console.warn('fulfillReservation blocked - book already reserved', {
          reservationId: reservation._id?.toString(),
          bookId: reservation.book._id?.toString(),
          studentId: reservation.student?._id?.toString(),
          requestedBy: req.user?._id?.toString?.() || null
        });
        return res.status(400).json({ code: 'BOOK_RESERVED', message: 'This book is already reserved by another student' });
      }

      // Update reservation status
      reservation.status = 'Fulfilled';
      await reservation.save({ session });

      // Update book status if needed
      const book = await Book.findById(reservation.book._id).session(session);
      if (!book) {
        await session.abortTransaction();
        session.endSession();
        console.error('fulfillReservation failed - book not found', {
          reservationId: reservation._id?.toString(),
          bookId: reservation.book?._id?.toString(),
          requestedBy: req.user?._id?.toString?.() || null
        });
        return res.status(404).json({ code: 'BOOK_NOT_FOUND', message: "Book not found" });
      }
      
      // Update book status to reflect it's ready for loan by this student
      book.status = "Reserved";
      book.available = false;
      await book.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.info('fulfillReservation success', {
        reservationId: reservation._id?.toString(),
        bookId: reservation.book._id?.toString(),
        studentId: reservation.student?._id?.toString(),
        requestedBy: req.user?._id?.toString?.() || null
      });

      res.json({ 
        message: "Reservation fulfilled successfully", 
        reservation 
      });
    } catch (error) {
      // Ensure we abort the transaction if it's still active
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // ignore
      }
      try {
        session.endSession();
      } catch (endErr) {
        // ignore
      }
      // Return a 400 for known business errors (Error with message) or 500 for unexpected ones
      // Log and return structured errors for known cases
      console.error('Error in fulfillReservation transaction:', error, {
        reservationId: reservation._id?.toString(),
        bookId: reservation.book?._id?.toString(),
        studentId: reservation.student?._id?.toString(),
        requestedBy: req.user?._id?.toString?.() || null
      });

      if (error && error.message) {
        const msg = error.message;
        if (msg.includes('reserved')) {
          return res.status(400).json({ code: 'BOOK_RESERVED', message: msg });
        }
        if (msg.includes('not')) {
          return res.status(400).json({ code: 'BUSINESS_ERROR', message: msg });
        }
      }
      throw error;
    }
  } catch (err) {
    console.error('Error fulfilling reservation:', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
  }
};

// Get all reservations
exports.getAllReservations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status; // Optional status filter
    
    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      if (status === 'active') {
        filter.status = 'Active';
      } else if (status === 'fulfilled') {
        filter.status = 'Fulfilled';
      } else if (status === 'cancelled') {
        filter.status = 'Cancelled';
      }
    }
    
    // Get total count
    const total = await Reservation.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated reservations
    const reservations = await Reservation.find(filter)
      .populate("book")
      .populate("student")
      .sort({ reservedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      reservations,
      pagination: {
        currentPage: page,
        totalPages,
        totalReservations: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete all reservations (admin only)
exports.deleteAllReservations = async (req, res) => {
  try {
    const result = await Reservation.deleteMany({});
    
    // Also update all books that were reserved to Available
    await Book.updateMany(
      { status: 'Reserved' },
      { 
        status: 'Available',
        available: true
      }
    );
    
    res.json({ 
      message: 'All reservations deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
