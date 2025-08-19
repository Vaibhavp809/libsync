const mongoose = require('mongoose');

const nocSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedOn: { type: Date, default: Date.now },
  remarks: String,
  status: { type: String, enum: ['Issued', 'Pending'], default: 'Issued' }
});

module.exports = mongoose.model('NOC', nocSchema);
