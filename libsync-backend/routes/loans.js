const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  getAllLoans,
  issueBook,
  returnBook,
  getIssuedBooks,
  getOverdueLoans,
  sendOverdueReminder,
  issueBookByEmailAndISBN,
  returnBookByEmailAndISBN
} = require("../controllers/loanController");

router.get("/", verifyToken, getAllLoans);
router.post("/issue", verifyToken, issueBook);
router.post("/issue-by-email-isbn", verifyToken, issueBookByEmailAndISBN);
router.put("/return/:loanId", verifyToken, returnBook);
router.put("/:loanId/return", verifyToken, returnBook);
router.post("/return-by-email-isbn", verifyToken, returnBookByEmailAndISBN);
router.get("/issued", verifyToken, getIssuedBooks);
router.get("/overdue", verifyToken, getOverdueLoans);
router.post("/:loanId/reminder", verifyToken, sendOverdueReminder);

module.exports = router;
