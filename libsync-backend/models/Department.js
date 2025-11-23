const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  studentIdCode: {
    type: String,
    uppercase: true,
    default: null,
    sparse: true // Allows multiple nulls but unique when set
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Department', departmentSchema);

