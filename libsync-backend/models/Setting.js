const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  loanDurationDays: { type: Number, default: 14 },
  maxActiveLoansPerStudent: { type: Number, default: 5 },
  finePerDay: { type: Number, default: 10 },
  attendanceQrExpiryMinutes: { type: Number, default: 15 },
  emailTemplates: {
    overdueReminder: { type: String, default: 'Your book is overdue. Please return it as soon as possible.' },
    reservationReady: { type: String, default: 'Your reserved book is ready for pickup.' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);


