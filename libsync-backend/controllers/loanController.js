const Loan = require("../models/Loan");
const Book = require("../models/Book");
const User = require("../models/User");
const Setting = require('../models/Setting');
const { sendMail } = require('../utils/mailer');

exports.issueBook = async (req, res) => {
  try {
    const { bookId, studentId, dueDate } = req.body;

    const book = await Book.findById(bookId);
    if (!book || book.status !== "Available") {
      return res.status(400).json({ message: "Book is not available" });
    }

    const settings = await Setting.findOne() || {};
    const maxActive = settings.maxActiveLoansPerStudent || 5;
    const activeLoans = await Loan.countDocuments({ student: studentId, status: 'Issued' });
    if (activeLoans >= maxActive) {
      return res.status(400).json({ message: `Student has reached the maximum of ${maxActive} active loans` });
    }

    const loan = new Loan({
      book: bookId,
      student: studentId,
      dueDate: new Date(dueDate),
      issuedBy: req.user?.id || null
    });

    await loan.save();

    book.status = "Issued";
    book.available = false;
    await book.save();

    res.status(201).json({ message: "Book issued successfully", loan });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId).populate("book");
    if (!loan) return res.status(404).json({ message: "Loan record not found" });

    loan.returnDate = new Date();
    loan.status = "Returned";

    // Fine calculation
    const settings = await Setting.findOne() || {};
    const finePerDay = settings.finePerDay || 10;
    if (loan.dueDate && loan.returnDate > loan.dueDate) {
      const daysLate = Math.ceil((loan.returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
      loan.fine = Math.max(0, daysLate * finePerDay);
    } else {
      loan.fine = 0;
    }
    await loan.save();

    // Update book availability
    const book = await Book.findById(loan.book._id);
    book.status = "Available";
    book.available = true;
    await book.save();

    res.json({ message: "Book returned successfully", loan });
  } catch (err) {
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

// NEW: Issue book by email and ISBN
exports.issueBookByEmailAndISBN = async (req, res) => {

  try {
    const { studentEmail, studentID, bookISBN, dueDate } = req.body;

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

    // Find book by ISBN
    const book = await Book.findOne({ isbn: bookISBN });
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
        book: { title: book.title, isbn: book.isbn },
        student: { name: student.name, email: student.email, studentID: student.studentID }
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// NEW: Return book by email and ISBN
exports.returnBookByEmailAndISBN = async (req, res) => {

  try {
    const { studentEmail, studentID, bookISBN } = req.body;

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

    // Find book by ISBN
    const book = await Book.findOne({ isbn: bookISBN });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Find active loan
    const loan = await Loan.findOne({
      book: book._id,
      student: student._id,
      status: 'Issued'
    }).populate('book');

    if (!loan) {
      return res.status(404).json({ message: "No active loan found for this book and student" });
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
    loan.status = "Returned";
    loan.fine = fine;
    await loan.save();

    // Update book availability
    book.status = "Available";
    book.available = true;
    await book.save();

    res.json({ 
      message: "Book returned successfully", 
      loan: {
        ...loan.toObject(),
        book: { title: book.title, isbn: book.isbn },
        student: { name: student.name, email: student.email, studentID: student.studentID },
        fine
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};