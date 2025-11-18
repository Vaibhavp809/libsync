const mongoose = require('mongoose');

const LibraryUpdateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty links
        return /^https?:\/\/.+/.test(v); // Basic URL validation
      },
      message: 'Link must be a valid URL starting with http:// or https://'
    }
  },
  type: {
    type: String,
    enum: ['placement_alert', 'circular', 'e_resource', 'announcement', 'job_opening', 'event', 'other'],
    default: 'announcement'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetDepartments: [String],
  targetBatches: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: { 
    type: Date, 
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 // auto-expiry in 7 days
  }
});

// Indexes for better query performance
LibraryUpdateSchema.index({ type: 1, priority: 1 });
LibraryUpdateSchema.index({ targetDepartments: 1 });
LibraryUpdateSchema.index({ targetBatches: 1 });
LibraryUpdateSchema.index({ isActive: 1, isPinned: 1 });
LibraryUpdateSchema.index({ createdAt: -1 });
LibraryUpdateSchema.index({ expiresAt: 1 });
LibraryUpdateSchema.index({ tags: 1 });

// Text index for search
LibraryUpdateSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Middleware to update updatedAt
LibraryUpdateSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual for checking if expired
LibraryUpdateSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to increment view count
LibraryUpdateSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Static method to get active updates
LibraryUpdateSchema.statics.getActiveUpdates = function(options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    priority,
    department,
    batch,
    pinned = false
  } = options;

  const skip = (page - 1) * limit;
  
  let query = {
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (pinned) query.isPinned = true;

  // Department and batch filtering
  if (department) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { targetDepartments: { $in: [department] } },
        { targetDepartments: { $size: 0 } }
      ]
    });
  }

  if (batch) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { targetBatches: { $in: [batch] } },
        { targetBatches: { $size: 0 } }
      ]
    });
  }

  const sortQuery = pinned 
    ? { isPinned: -1, createdAt: -1 }
    : { createdAt: -1 };

  return this.find(query)
    .populate('createdBy', 'name email')
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);
};

// Static method for cleanup expired updates
LibraryUpdateSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isActive: false // Only cleanup inactive expired updates
  });
};

module.exports = mongoose.model('LibraryUpdate', LibraryUpdateSchema);