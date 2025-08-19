const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  reserveBook,
  cancelReservation,
  getStudentReservations,getAllReservations
} = require("../controllers/reservationController");

router.get("/", verifyToken, getAllReservations); 
router.post("/reserve", verifyToken, reserveBook);
router.put("/cancel/:id", verifyToken, cancelReservation);
router.get("/student/:studentId", verifyToken, getStudentReservations);

module.exports = router;
