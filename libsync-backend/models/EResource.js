const mongoose = require('mongoose');

const eResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['e-book', 'journal', 'database', 'video', 'course', 'research_paper', 'thesis', 'article', 'website', 'other'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  publisher: {
    type: String,
    trim: true
  },
  publicationDate: {
    type: Date
  },
  language: {
    type: String,
    default: 'English'
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  thumbnailUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Thumbnail URL must be a valid HTTP or HTTPS URL'
    }
  },
  fileSize: {
    type: String, // e.g., "15.2 MB", "2.1 GB"
  },
  format: {
    type: String, // e.g., "PDF", "EPUB", "HTML", "MP4"
  },
  accessType: {
    type: String,
    enum: ['free', 'subscription', 'institutional', 'restricted'],
    default: 'free'
  },
  accessCredentials: {
    username: String,
    password: String,
    accessCode: String,
    instructions: String
  },
  targetDepartments: [String],
  targetCourses: [String],
  keywords: [String],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
eResourceSchema.index({ type: 1, category: 1 });
eResourceSchema.index({ targetDepartments: 1 });
eResourceSchema.index({ keywords: 1 });
eResourceSchema.index({ isActive: 1, isFeatured: 1 });
eResourceSchema.index({ createdAt: -1 });
eResourceSchema.index({ rating: -1 });
eResourceSchema.index({ viewCount: -1 });

// Text index for search
eResourceSchema.index({
  title: 'text',
  description: 'text',
  author: 'text',
  keywords: 'text',
  category: 'text',
  subject: 'text'
});

// Middleware to update updatedAt
eResourceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual for checking if resource is expired
eResourceSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Method to increment view count
eResourceSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to increment download count
eResourceSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Method to add review
eResourceSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from same user
  this.reviews = this.reviews.filter(review => 
    review.user.toString() !== userId.toString()
  );
  
  // Add new review
  this.reviews.push({
    user: userId,
    rating,
    comment,
    createdAt: new Date()
  });
  
  // Recalculate rating and review count
  this.reviewCount = this.reviews.length;
  this.rating = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviewCount;
  
  return this.save();
};

// Static method to get resources for a department
eResourceSchema.statics.getForDepartment = function(department, options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    category,
    featured = false
  } = options;

  const skip = (page - 1) * limit;
  
  let query = {
    isActive: true,
    $or: [
      { targetDepartments: { $in: [department] } },
      { targetDepartments: { $size: 0 } } // Resources available to all departments
    ]
  };

  // Add expiry filter
  query.$and = [{
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  }];

  if (type) query.type = type;
  if (category) query.category = category;
  if (featured) query.isFeatured = true;

  return this.find(query)
    .populate('addedBy', 'name email')
    .sort({ isFeatured: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method for text search
eResourceSchema.statics.searchResources = function(searchQuery, options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    category,
    department
  } = options;

  const skip = (page - 1) * limit;
  
  let query = {
    isActive: true,
    $text: { $search: searchQuery }
  };

  // Add expiry filter
  query.$and = [{
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  }];

  if (type) query.type = type;
  if (category) query.category = category;
  if (department) {
    query.$or = [
      { targetDepartments: { $in: [department] } },
      { targetDepartments: { $size: 0 } }
    ];
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('addedBy', 'name email')
    .sort({ score: { $meta: 'textScore' }, isFeatured: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('EResource', eResourceSchema);