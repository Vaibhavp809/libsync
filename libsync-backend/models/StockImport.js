// models/StockImport.js
const mongoose = require('mongoose');

const stockImportSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true }, // unique: true already creates an index
  fileName: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now, required: true },
  totalRows: { type: Number, required: true },
  updatedCount: { type: Number, default: 0 },
  notFoundCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  action: { type: String, enum: ['import', 'reset-all'], default: 'import' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For reset-all actions
  performedAt: { type: Date }, // For reset-all actions
  count: { type: Number } // For reset-all actions (number of books reset)
}, {
  timestamps: true
});

// Index for faster queries (batchId already has unique index, so skip it)
stockImportSchema.index({ uploadedAt: -1 });
stockImportSchema.index({ uploadedBy: 1 });
stockImportSchema.index({ action: 1 });

module.exports = mongoose.model('StockImport', stockImportSchema);

