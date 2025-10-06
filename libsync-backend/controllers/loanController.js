const mongoose = require('mongoose');
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const User = require("../models/User");
const Setting = require('../models/Setting');
const { sendMail } = require('../utils/mailer');

exports.issueBook = async (req, res) => {
  try {
    const { studentId, bookId, dueDate } = req.body;

    // Validate required fields
    if (!studentId || !bookId || !dueDate) {
      return res.status(400).json({ message: "Student ID, Book ID, and Due Date are required" });
    }

    // Check if the student exists (support both ObjectId and studentID)
    let student;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      // If it's an ObjectId, find by _id
      student = await User.findById(studentId);
    } else {
      // If it's a string, assume it's studentID (USN)
      student = await User.findOne({ studentID: studentId, role: 'student' });
    }
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check how many books are already issued to this student
    const activeLoans = await Loan.find({ student: student._id, status: 'Issued' });
    if (activeLoans.length >= 4) {
      return res.status(400).json({ 
        message: "Issue limit reached. Student must return a book first.",
        currentLoans: activeLoans.length,
        maxLoans: 4
      });
    }

    // Check if the book exists and is available
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.status !== "Available" && book.status !== "Reserved") {
      return res.status(400).json({ message: "Book is not available for issue" });
    }

    // Check if there's a valid reservation for this book and student
    const Reservation = require('../models/Reservation');
    const validReservation = await Reservation.findOne({
      book: bookId,
      student: student._id,
      status: { $in: ['Active', 'Fulfilled'] }
    });
    
    // Check if someone else has a fulfilled reservation
    const otherFulfilled = await Reservation.findOne({
      book: bookId,
      student: { $ne: student._id },
      status: 'Fulfilled'
    });

    if (otherFulfilled) {
      return res.status(400).json({ message: "This book is reserved for another student" });
    }

    // If the book is reserved and the requesting student does not have any reservation, block
    if (book.status === "Reserved" && !validReservation) {
      return res.status(400).json({ message: "This book is reserved for another student" });
    }

    // If the requesting student has an Active reservation, ensure it's their turn
    if (validReservation && validReservation.status === 'Active') {
      const earlierActive = await Reservation.findOne({
        book: bookId,
        student: { $ne: student._id },
        status: 'Active',
        reservedAt: { $lt: validReservation.reservedAt }
      }).sort({ reservedAt: 1 });
      if (earlierActive) {
        return res.status(400).json({ message: "This book is reserved for another student" });
      }
    }

    // Create the loan
    const loan = new Loan({
      book: bookId,
      student: student._id,
      dueDate: new Date(dueDate),
      status: "Issued",
      issuedBy: req.user?.id || null
    });

    await loan.save();

    // Update book status
    book.status = "Issued";
    book.available = false;
    await book.save();

    // Populate the loan with book and student details for response
    const populatedLoan = await Loan.findById(loan._id)
      .populate('book', 'title author accessionNumber')
      .populate('student', 'name studentID email');

    res.status(201).json({ 
      message: "Book issued successfully", 
      loan: populatedLoan,
      studentActiveLoans: activeLoans.length + 1
    });
  } catch (err) {
    console.error('Error issuing book:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.returnBook = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const loan = await Loan.findById(req.params.loanId).populate('book').session(session);
    if (!loan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Loan record not found' });
    }

    loan.returnDate = new Date();
    loan.status = 'Returned';

    // Fine calculation
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    if (loan.dueDate && loan.returnDate > loan.dueDate) {
      const daysLate = Math.ceil((loan.returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
      loan.fine = Math.max(0, daysLate * finePerDay);
    } else {
      loan.fine = 0;
    }
    await loan.save({ session });

    // Update book availability
    const book = await Book.findById(loan.book._id).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Book not found' });
    }

    book.status = 'Available';
    book.available = true;
    await book.save({ session });

    // If there is an active reservation queue for this book, fulfill the next one
    const Reservation = require('../models/Reservation');
    const nextReservation = await Reservation.findOne({ book: book._id, status: 'Active' }).sort({ reservedAt: 1 }).session(session);
    if (nextReservation) {
      nextReservation.status = 'Fulfilled';
      await nextReservation.save({ session });

      book.status = 'Reserved';
      book.available = false;
      await book.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Book returned successfully', loan });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (e) {
      // ignore
    }
    try { session.endSession(); } catch (e) { }
    console.error('Error returning book with transaction:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getIssuedBooks = async (req, res) => {
  try {
    const loans = await Loan.find({ status: "Issued" })
      .populate("book")
      .populate("student");
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate("book")
      .populate("student");
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOverdueLoans = async (req, res) => {
  try {
    const now = new Date();
    const loans = await Loan.find({ status: 'Issued', dueDate: { $lt: now } })
      .populate('book')
      .populate('student');
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendOverdueReminder = async (req, res) => {
  try {
  const { loanId } = req.params;
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;

      const loan = await Loan.findById(loanId).populate('book').populate('student');
      console.log('DEBUG sendOverdueReminder:', {
        loanId: loanId,
        status: loan?.status,
        dueDate: loan?.dueDate,
        now: new Date(),
      });
    if (!loan) {
      return res.status(400).json({ message: 'Loan not found' });
    }
    if (loan.status !== 'Issued') {
      return res.status(400).json({ message: `Loan status is not Issued, got: ${loan.status}` });
    }
    if (!loan.dueDate) {
      return res.status(400).json({ message: 'Loan has no dueDate' });
    }
    // Compare only the date part (ignore time)
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(loan.dueDate);
    dueDate.setHours(0,0,0,0);
    if (dueDate > today) {
      return res.status(400).json({ message: `Loan dueDate is in the future: ${loan.dueDate}` });
    }
    const daysLate = Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const fine = Math.max(0, daysLate * finePerDay);
    const subject = `Overdue Reminder: ${loan.book?.title}`;
    const body = (settings.emailTemplates?.overdueReminder || 'Your book is overdue. Please return it as soon as possible.')
      + `\n\nBook: ${loan.book?.title}\nDue: ${new Date(loan.dueDate).toLocaleDateString()}\nFine so far: ₹${fine}`;

    if (!loan.student?.email) return res.status(400).json({ message: 'Student has no email' });
    await sendMail({ to: loan.student.email, subject, text: body });
    loan.lastReminderSentAt = new Date();
    await loan.save();
    res.json({ message: 'Reminder sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: Issue book by email and accession number
exports.issueBookByEmailAndAccessionNumber = async (req, res) => {

  try {
    const { studentEmail, studentID, accessionNumber, dueDate } = req.body;

    // Find student by studentID or email
    let student = null;
    if (studentID) {
      student = await User.findOne({ studentID, role: 'student' });
    }
    if (!student && studentEmail) {
      student = await User.findOne({ email: studentEmail, role: 'student' });
    }
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find book by accession number
    const book = await Book.findOne({ accessionNumber });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.status !== "Available" || !book.available) {
      return res.status(400).json({ message: "Book is not available for issue" });
    }

    // Check student's active loan limit
    const settings = await Setting.findOne() || {};
    const maxActive = settings.maxActiveLoansPerStudent || 5;
    const activeLoans = await Loan.countDocuments({ student: student._id, status: 'Issued' });
    if (activeLoans >= maxActive) {
      return res.status(400).json({ message: `Student has reached the maximum of ${maxActive} active loans` });
    }

    // Create loan
    const loan = new Loan({
      book: book._id,
      student: student._id,
      dueDate: new Date(dueDate),
      issuedBy: req.user?.id || null
    });

    await loan.save();

    // Update book status
    book.status = "Issued";
    book.available = false;
    await book.save();

    res.status(201).json({ 
      message: "Book issued successfully", 
      loan: {
        ...loan.toObject(),
        book: { title: book.title, accessionNumber: book.accessionNumber },
        student: { name: student.name, email: student.email, studentID: student.studentID }
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: Return book by email and accession number
exports.returnBookByEmailAndAccessionNumber = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { studentEmail, studentID, accessionNumber } = req.body;

    // Find student by studentID or email
    let student = null;
    if (studentID) {
      student = await User.findOne({ studentID, role: 'student' }).session(session);
    }
    if (!student && studentEmail) {
      student = await User.findOne({ email: studentEmail, role: 'student' }).session(session);
    }
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find book by accession number
    const book = await Book.findOne({ accessionNumber }).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Book not found' });
    }

    // Find active loan
    const loan = await Loan.findOne({
      book: book._id,
      student: student._id,
      status: 'Issued'
    }).populate('book').session(session);

    if (!loan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'No active loan found for this book and student' });
    }

    // Calculate fine
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    const returnDate = new Date();
    let fine = 0;

    if (loan.dueDate && returnDate > loan.dueDate) {
      const daysLate = Math.ceil((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
      fine = Math.max(0, daysLate * finePerDay);
    }

    // Update loan
    loan.returnDate = returnDate;
    loan.status = 'Returned';
    loan.fine = fine;
    await loan.save({ session });

    // Update book availability
    book.status = 'Available';
    book.available = true;
    await book.save({ session });

    // If there is an active reservation queue for this book, fulfill the next one
    const Reservation = require('../models/Reservation');
    const nextReservation = await Reservation.findOne({ book: book._id, status: 'Active' }).sort({ reservedAt: 1 }).session(session);
    if (nextReservation) {
      nextReservation.status = 'Fulfilled';
      await nextReservation.save({ session });

      book.status = 'Reserved';
      book.available = false;
      await book.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: 'Book returned successfully', 
      loan: {
        ...loan.toObject(),
        book: { title: book.title, accessionNumber: book.accessionNumber },
        student: { name: student.name, email: student.email, studentID: student.studentID },
        fine
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) { }
    try { session.endSession(); } catch (e) { }
    console.error('Error returning book by email/accession number with transaction:', err);
    res.status(500).json({ message: err.message });
  }
};

// NEW: Return book by accession number only
exports.returnBookByAccessionNumber = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { accessionNumber } = req.body;

    if (!accessionNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Accession number is required' });
    }

    // Find book by accession number
    const book = await Book.findOne({ accessionNumber }).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Book not found' });
    }

    // Find active loan for this book
    const loan = await Loan.findOne({
      book: book._id,
      status: 'Issued'
    }).populate('book').populate('student').session(session);

    if (!loan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'No active loan found for this book' });
    }

    // Calculate fine
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    const returnDate = new Date();
    let fine = 0;

    if (loan.dueDate && returnDate > loan.dueDate) {
      const daysLate = Math.ceil((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
      fine = Math.max(0, daysLate * finePerDay);
    }

    // Update loan
    loan.returnDate = returnDate;
    loan.status = 'Returned';
    loan.fine = fine;
    await loan.save({ session });

    // Update book availability
    book.status = 'Available';
    book.available = true;
    await book.save({ session });

    // If there is an active reservation queue for this book, fulfill the next one
    const Reservation = require('../models/Reservation');
    const nextReservation = await Reservation.findOne({ book: book._id, status: 'Active' }).sort({ reservedAt: 1 }).session(session);
    if (nextReservation) {
      nextReservation.status = 'Fulfilled';
      await nextReservation.save({ session });

      book.status = 'Reserved';
      book.available = false;
      await book.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: 'Book returned successfully', 
      loan: {
        ...loan.toObject(),
        book: { title: book.title, accessionNumber: book.accessionNumber, author: book.author },
        student: { 
          name: loan.student.name, 
          email: loan.student.email, 
          studentID: loan.student.studentID,
          department: loan.student.department 
        },
        fine,
        returnDate
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) { }
    try { session.endSession(); } catch (e) { }
    console.error('Error returning book by accession number with transaction:', err);
    res.status(500).json({ message: err.message });
  }
};
