const mongoose = require('mongoose');

/**
 * Tracks hardcoded/default departments that have been deleted by admin
 * This allows us to filter them out from the hardcoded list
 */
const deletedDepartmentSchema = new mongoose.Schema({
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
  deletedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeletedDepartment', deletedDepartmentSchema);

