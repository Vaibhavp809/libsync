const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { verifyStudentOrAdmin, verifyStudentOwnership } = require("../middleware/studentAuth");
const {
  reserveBook,
  cancelReservation,
  getStudentReservations,
  getAllReservations,
  deleteAllReservations,
  sendReservationReadyNotification,
  fulfillReservation
} = require("../controllers/reservationController");

router.get("/", verifyToken, getAllReservations); 
router.post("/reserve", verifyStudentOrAdmin, reserveBook);
router.put("/cancel/:id", verifyStudentOrAdmin, cancelReservation);
router.put("/:id/fulfill", verifyToken, fulfillReservation);
router.post("/:id/send-notification", verifyToken, require("../middleware/adminAuth"), sendReservationReadyNotification);
router.get("/student/:studentId", verifyStudentOrAdmin, verifyStudentOwnership, getStudentReservations);
router.delete("/all", verifyToken, require("../middleware/adminAuth"), deleteAllReservations);

// Student-accessible routes
router.post("/", verifyStudentOrAdmin, async (req, res) => {
  try {
    const { bookId, studentId } = req.body;
    
    // For students, always use their authenticated user ID from the token
    // Ignore any studentId sent by the client to prevent ID mismatch issues
    if (req.user.role === 'student') {
      // Use the authenticated user's ID from the token (convert to string for consistency)
      const authenticatedUserId = String(req.user.id || req.user._id);
      
      // Always use the authenticated user's ID, regardless of what the client sent
      req.body.studentId = authenticatedUserId;
    }
    // For admins, use the provided studentId (they can reserve for any student)
    
    // Call the existing reserveBook controller
    const { reserveBook } = require("../controllers/reservationController");
    return reserveBook(req, res);
  } catch (err) {
    console.error('Error in reservation route:', err);
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
