const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['placement', 'library', 'general'], default: 'general' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bulletin', bulletinSchema);
