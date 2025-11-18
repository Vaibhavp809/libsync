// models/Book.js
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  accessionNumber: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  publisher: { type: String, required: true },
  yearOfPublishing: { type: Number, required: true },
  edition: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['Available', 'Reserved', 'Issued'], default: 'Available' },
  available: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  // Stock verification fields
  condition: { type: String, enum: ['Good', 'Damaged', 'Lost'], default: 'Good' },
  lastVerifiedAt: { type: Date },
  verificationHistory: [{
    status: { type: String, required: true }, // 'Verified', 'Damaged', 'Lost'
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    source: { type: String } // e.g., filename for imports
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
bookSchema.index({ title: 'text', author: 'text', publisher: 'text' }); // Text search
bookSchema.index({ category: 1 }); // Category filtering
bookSchema.index({ status: 1 }); // Status filtering
bookSchema.index({ available: 1 }); // Availability filtering
bookSchema.index({ createdAt: -1 }); // Sorting by creation date
bookSchema.index({ yearOfPublishing: 1 }); // Year filtering
// Note: accessionNumber already has a unique index from schema definition

module.exports = mongoose.model("Book", bookSchema);
