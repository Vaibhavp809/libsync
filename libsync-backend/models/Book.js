// models/Book.js
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: String,
  isbn: String,
  ddc: String,
  category: String,
  status: { type: String, enum: ['Available', 'Issued'], default: 'Available' },
  available: { type: Boolean, default: true },
  verified: { type: Boolean, default: false }
});

module.exports = mongoose.model("Book", bookSchema);
