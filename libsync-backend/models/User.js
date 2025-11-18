const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'librarian'], default: 'student' },
  studentID: String, // Only for students
  department: String,
  pushToken: String, // Expo push notification token
  pushTokenUpdatedAt: Date, // When push token was last updated
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
