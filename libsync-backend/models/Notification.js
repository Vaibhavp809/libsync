const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['reservation', 'due_date', 'announcement', 'placement', 'general', 'urgent', 'email', 'app'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  recipients: {
    type: String,
    enum: ['all', 'students', 'specific'],
    default: 'all'
  },
  // New fields for better targeting
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  broadcast: {
    type: Boolean,
    default: false
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  department: {
    type: String,
    // Optional: target specific department
  },
  data: {
    // Additional data for specific notification types
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    },
    link: String, // For external links (placements, resources)
    attachmentUrl: String,
    expiryDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'scheduled', 'expired', 'draft'],
    default: 'active'
  },
  scheduledFor: {
    type: Date,
    // For scheduling notifications in the future
  },
  expiresAt: {
    type: Date,
    // When notification should expire/hide
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  // Legacy field for backward compatibility
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Indexes for better query performance
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ recipients: 1, department: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'readBy.user': 1 });
notificationSchema.index({ expiresAt: 1 });

// Middleware to update updatedAt
notificationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual for checking if notification is read by a specific user
notificationSchema.methods.isReadByUser = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Static method to get notifications for a user
notificationSchema.statics.getForUser = async function(userId, userDepartment, options = {}) {
  const {
    limit = 20,
    page = 1,
    type,
    unreadOnly = false
  } = options;

  const skip = (page - 1) * limit;
  
  // Convert userId to ObjectId if it's a string (for proper MongoDB querying)
  const mongoose = require('mongoose');
  let userIdObj = userId;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    userIdObj = new mongoose.Types.ObjectId(userId);
  }
  
  let query = {
    status: 'active',
    $or: [
      // New targeting fields (preferred)
      { broadcast: true },
      { recipient: userIdObj },
      // Legacy fields (backward compatibility)
      { recipients: 'all' },
      { 
        recipients: 'specific',
        targetUsers: userIdObj
      },
      // Legacy compatibility
      { user: userIdObj }
    ]
  };

  // Add expiry filter
  query.$and = [
    {
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }
  ];

  // Add department filter if specified
  // Department notifications should have: department set, broadcast false, and no specific recipient
  if (userDepartment) {
    query.$or.push({ 
      department: userDepartment,
      broadcast: false,
      $or: [
        { recipient: { $exists: false } },
        { recipient: null }
      ]
    });
  }

  // Add type filter
  if (type) {
    query.type = type;
  }

  // Add unread filter
  if (unreadOnly) {
    query['readBy.user'] = { $ne: userIdObj };
  }

  try {
    // Get distinct notification IDs first to prevent duplicates from multiple $or conditions
    const distinctIds = await this.find(query).distinct('_id');
    
    if (distinctIds.length === 0) {
      return [];
    }
    
    // Fetch notifications with pagination, maintaining sort order
    const notifications = await this.find({ _id: { $in: distinctIds } })
      .populate('createdBy', 'name email')
      .populate('data.bookId', 'title author')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    return notifications;
  } catch (error) {
    console.error('Error in getForUser:', error);
    console.error('Query was:', JSON.stringify(query, null, 2));
    throw error;
  }
};

// Static method to mark as read
notificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findByIdAndUpdate(
    notificationId,
    {
      $addToSet: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    },
    { new: true }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
