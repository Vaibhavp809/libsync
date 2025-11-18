const mongoose = require('mongoose');

const placementNewsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['job_opening', 'campus_drive', 'placement_stats', 'success_story', 'interview_tips', 'company_visit', 'announcement', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  company: {
    name: String,
    logo: String,
    website: String,
    industry: String,
    location: String
  },
  jobDetails: {
    position: String,
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance']
    },
    experience: String, // e.g., "0-2 years", "Fresher"
    salary: String,
    location: String,
    skills: [String],
    qualifications: [String],
    applicationDeadline: Date,
    applyLink: String
  },
  targetDepartments: [String],
  targetBatches: [String], // e.g., ["2024", "2025"]
  eligibilityCriteria: {
    minCGPA: Number,
    maxBacklogs: Number,
    specificRequirements: [String]
  },
  images: [String], // URLs to images
  attachments: [{
    name: String,
    url: String,
    type: String // 'pdf', 'doc', 'image', etc.
  }],
  tags: [String],
  eventDate: Date, // For campus drives, company visits
  registrationDeadline: Date,
  registrationLink: String,
  contactDetails: {
    name: String,
    email: String,
    phone: String,
    office: String
  },
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
  interestedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    interestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  publishedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
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
  }
});

// Indexes for better query performance
placementNewsSchema.index({ type: 1, priority: 1 });
placementNewsSchema.index({ targetDepartments: 1 });
placementNewsSchema.index({ targetBatches: 1 });
placementNewsSchema.index({ isActive: 1, isPinned: 1 });
placementNewsSchema.index({ publishedAt: -1 });
placementNewsSchema.index({ 'jobDetails.applicationDeadline': 1 });
placementNewsSchema.index({ eventDate: 1 });
placementNewsSchema.index({ expiresAt: 1 });
placementNewsSchema.index({ tags: 1 });

// Text index for search
placementNewsSchema.index({
  title: 'text',
  content: 'text',
  summary: 'text',
  'company.name': 'text',
  'jobDetails.position': 'text',
  tags: 'text'
});

// Middleware to update updatedAt
placementNewsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual for checking if expired
placementNewsSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for checking if application deadline passed
placementNewsSchema.virtual('isApplicationDeadlinePassed').get(function() {
  return this.jobDetails.applicationDeadline && this.jobDetails.applicationDeadline < new Date();
});

// Virtual for checking if registration deadline passed
placementNewsSchema.virtual('isRegistrationDeadlinePassed').get(function() {
  return this.registrationDeadline && this.registrationDeadline < new Date();
});

// Method to increment view count
placementNewsSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to add interested student
placementNewsSchema.methods.addInterestedStudent = function(studentId) {
  // Check if student already showed interest
  const existingInterest = this.interestedStudents.find(
    item => item.student.toString() === studentId.toString()
  );
  
  if (!existingInterest) {
    this.interestedStudents.push({
      student: studentId,
      interestedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove interested student
placementNewsSchema.methods.removeInterestedStudent = function(studentId) {
  this.interestedStudents = this.interestedStudents.filter(
    item => item.student.toString() !== studentId.toString()
  );
  
  return this.save();
};

// Static method to get news for a department and batch
placementNewsSchema.statics.getForStudent = function(department, batch, options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    priority,
    pinned = false
  } = options;

  const skip = (page - 1) * limit;
  
  let query = {
    isActive: true,
    publishedAt: { $lte: new Date() }
  };

  // Add expiry filter
  query.$and = [{
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }];

  // Department and batch filtering
  const departmentBatchFilter = {
    $and: [
      {
        $or: [
          { targetDepartments: { $in: [department] } },
          { targetDepartments: { $size: 0 } }
        ]
      },
      {
        $or: [
          { targetBatches: { $in: [batch] } },
          { targetBatches: { $size: 0 } }
        ]
      }
    ]
  };

  query = { ...query, ...departmentBatchFilter };

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (pinned) query.isPinned = true;

  const sortQuery = pinned 
    ? { isPinned: -1, publishedAt: -1 }
    : { publishedAt: -1 };

  return this.find(query)
    .populate('createdBy', 'name email')
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);
};

// Static method for text search
placementNewsSchema.statics.searchNews = function(searchQuery, department, batch, options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    priority
  } = options;

  const skip = (page - 1) * limit;
  
  let query = {
    isActive: true,
    publishedAt: { $lte: new Date() },
    $text: { $search: searchQuery }
  };

  // Add expiry filter
  query.$and = [{
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }];

  // Department and batch filtering
  if (department || batch) {
    const filters = [];
    if (department) {
      filters.push({
        $or: [
          { targetDepartments: { $in: [department] } },
          { targetDepartments: { $size: 0 } }
        ]
      });
    }
    if (batch) {
      filters.push({
        $or: [
          { targetBatches: { $in: [batch] } },
          { targetBatches: { $size: 0 } }
        ]
      });
    }
    query.$and.push(...filters);
  }

  if (type) query.type = type;
  if (priority) query.priority = priority;

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('createdBy', 'name email')
    .sort({ score: { $meta: 'textScore' }, isPinned: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('PlacementNews', placementNewsSchema);