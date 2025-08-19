const mongoose = require('mongoose');

const dailyCodeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to check if code is for today
dailyCodeSchema.methods.isToday = function() {
  const today = new Date();
  const codeDate = new Date(this.date);
  
  return today.getDate() === codeDate.getDate() &&
         today.getMonth() === codeDate.getMonth() &&
         today.getFullYear() === codeDate.getFullYear();
};

// Method to check if code is expired (older than 24 hours)
dailyCodeSchema.methods.isExpired = function() {
  const now = new Date();
  const codeDate = new Date(this.date);
  const hoursDiff = (now - codeDate) / (1000 * 60 * 60);
  
  return hoursDiff >= 24;
};

module.exports = mongoose.model('DailyCode', dailyCodeSchema);
