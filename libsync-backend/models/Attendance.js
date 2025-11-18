const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'left'],
    default: 'present'
  }
}, {
  timestamps: true
});

// Index for efficient queries (removed unique constraint to allow multiple sessions per day)
attendanceSchema.index({ student: 1, date: 1 });

// Virtual for calculating duration
attendanceSchema.virtual('duration').get(function() {
  if (this.logoutTime && this.loginTime) {
    return this.logoutTime - this.loginTime;
  }
  return null;
});

// Method to format duration
attendanceSchema.methods.getFormattedDuration = function() {
  if (!this.duration) return 'N/A';
  
  const hours = Math.floor(this.duration / (1000 * 60 * 60));
  const minutes = Math.floor((this.duration % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
