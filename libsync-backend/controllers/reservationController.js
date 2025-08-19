
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
    // Optionally, check if already reserved
    const existing = await Reservation.findOne({ book: bookId, status: "Active" });
    if (existing) {
      return res.status(400).json({ message: "Book is already reserved" });
    }
    const reservation = new Reservation({ book: bookId, student: studentId });
    await reservation.save();
    res.status(201).json({ message: "Book reserved successfully", reservation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel a reservation
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    reservation.status = "Cancelled";
    await reservation.save();
    res.json({ message: "Reservation cancelled", reservation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all reservations for a student
exports.getStudentReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ student: req.params.studentId })
      .populate("book");
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all reservations
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate("book")
      .populate("student");
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
