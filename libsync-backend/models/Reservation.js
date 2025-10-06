const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  reservedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Cancelled', 'Fulfilled'], default: 'Active' }
});

module.exports = mongoose.model('Reservation', reservationSchema);
