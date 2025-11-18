const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const verifyAdmin = require("../middleware/adminAuth");
const { verifyStudentOrAdmin, verifyStudentOwnership } = require("../middleware/studentAuth");
const {
  getAllLoans,
  issueBook,
  returnBook,
  getIssuedBooks,
  getOverdueLoans,
  sendOverdueReminder,
  issueBookByEmailAndAccessionNumber,
  returnBookByEmailAndAccessionNumber,
  returnBookByAccessionNumber,
  deleteAllLoans
} = require("../controllers/loanController");

router.get("/", verifyToken, verifyAdmin, getAllLoans);
router.post("/", verifyToken, verifyAdmin, issueBook); // New route for frontend
router.post("/issue", verifyToken, verifyAdmin, issueBook);
router.post("/issue-by-email-accession", verifyToken, verifyAdmin, issueBookByEmailAndAccessionNumber);
router.put("/return/:loanId", verifyToken, verifyAdmin, returnBook);
router.put("/:loanId/return", verifyToken, verifyAdmin, returnBook);
router.post("/return-by-email-accession", verifyToken, verifyAdmin, returnBookByEmailAndAccessionNumber);
router.post("/return-by-accession", verifyToken, verifyAdmin, returnBookByAccessionNumber);
router.get("/issued", verifyToken, verifyAdmin, getIssuedBooks);
router.get("/overdue", verifyToken, verifyAdmin, getOverdueLoans);
router.post("/:loanId/reminder", verifyToken, verifyAdmin, sendOverdueReminder);
router.delete("/all", verifyToken, verifyAdmin, deleteAllLoans);

// Student-accessible routes
router.get("/student/:studentId", verifyStudentOrAdmin, verifyStudentOwnership, async (req, res) => {
  try {
    const Loan = require("../models/Loan");
    const { studentId } = req.params;
    
    const loans = await Loan.find({ student: studentId })
      .populate("book")
      .populate("student")
      .sort({ issuedDate: -1 }); // Most recent first
    
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user's loans (for authenticated students)
router.get("/my-loans", verifyStudentOrAdmin, async (req, res) => {
  try {
    const Loan = require("../models/Loan");
    const studentId = req.user.id;
    
    const loans = await Loan.find({ student: studentId })
      .populate("book")
      .populate("student")
      .sort({ issuedDate: -1 });
    
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
