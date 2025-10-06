const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { verifyStudentOrAdmin, verifyStudentOwnership } = require("../middleware/studentAuth");
const {
  reserveBook,
  cancelReservation,
  getStudentReservations,getAllReservations
} = require("../controllers/reservationController");

router.get("/", verifyToken, getAllReservations); 
router.post("/reserve", verifyStudentOrAdmin, reserveBook);
router.put("/cancel/:id", verifyStudentOrAdmin, cancelReservation);
router.put("/:id/fulfill", verifyToken, require("../controllers/reservationController").fulfillReservation);
router.get("/student/:studentId", verifyStudentOrAdmin, verifyStudentOwnership, getStudentReservations);

// Student-accessible routes
router.post("/", verifyStudentOrAdmin, async (req, res) => {
  try {
    const { bookId, studentId } = req.body;
    
    // If user is a student, they can only reserve for themselves
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({ message: "Students can only make reservations for themselves" });
    }
    
    // Call the existing reserveBook controller
    const { reserveBook } = require("../controllers/reservationController");
    return reserveBook(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user's reservations (for authenticated students)
router.get("/my-reservations", verifyStudentOrAdmin, async (req, res) => {
  try {
    const Reservation = require("../models/Reservation");
    const studentId = req.user.id;
    
    const reservations = await Reservation.find({ student: studentId })
      .populate("book")
      .populate("student")
      .sort({ reservationDate: -1 });
    
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
