const mongoose = require('mongoose');

const pushNotificationLogSchema = new mongoose.Schema({
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  notificationTitle: {
    type: String,
    required: true
  },
  notificationMessage: {
    type: String,
    required: true
  },
  notificationType: {
    type: String,
    enum: ['reservation', 'due_date', 'announcement', 'placement', 'general', 'urgent'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  channelId: {
    type: String,
    default: 'default'
  },
  recipients: {
    type: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userEmail: String,
      userName: String,
      studentID: String,
      pushToken: String,
      status: {
        type: String,
        enum: ['sent', 'failed', 'invalid_token'],
        required: true
      },
      error: String,
      ticketId: String
    }],
    default: []
  },
  totalRecipients: {
    type: Number,
    default: 0
  },
  successfulSends: {
    type: Number,
    default: 0
  },
  failedSends: {
    type: Number,
    default: 0
  },
  invalidTokens: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'partial', 'failed'],
    default: 'pending'
  },
  error: String,
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
pushNotificationLogSchema.index({ notificationId: 1 });
pushNotificationLogSchema.index({ sentAt: -1 });
pushNotificationLogSchema.index({ status: 1 });
pushNotificationLogSchema.index({ notificationType: 1 });

module.exports = mongoose.model('PushNotificationLog', pushNotificationLogSchema);

