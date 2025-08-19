const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  returnDate: { type: Date },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fine: { type: Number, default: 0 },
  lastReminderSentAt: { type: Date },
  status: {
    type: String,
    enum: ["Issued", "Returned", "Overdue"],
    default: "Issued",
  }
});

module.exports = mongoose.model("Loan", loanSchema);
