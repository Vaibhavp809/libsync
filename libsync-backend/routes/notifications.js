const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/auth');
const { verifyStudentOrAdmin } = require('../middleware/studentAuth');
const Notification = require('../models/Notification');
const { normalizeDepartment } = require('../utils/departments');
const { deleteAllNotifications } = require('../controllers/notificationController');

// Get notifications for current user (alias: /my)
router.get('/my', verifyStudentOrAdmin, async (req, res) => {
  // Reuse the same logic as /my-notifications
  try {
    const userId = req.user.id;
    const userDepartment = req.user.department;
    
    const { 
      page = 1, 
      limit = 20, 
      type, 
      unreadOnly = false 
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      unreadOnly: unreadOnly === 'true'
    };

    const notifications = await Notification.getForUser(userId, userDepartment, options);
    
    // Add read status for each notification (notifications are plain objects from lean())
    const notificationsWithReadStatus = notifications.map(notification => {
      const readEntry = notification.readBy?.find(read => {
        const readUserId = read.user?._id?.toString() || read.user?.toString() || read.user;
        return readUserId === userId.toString();
      });
      
      return {
        ...notification,
        isRead: !!readEntry,
        readAt: readEntry?.readAt || null
      };
    });

    // Get total count for pagination
    const totalQuery = {
      status: 'active',
      $or: [
        // New targeting fields (preferred)
        { broadcast: true },
        { recipient: userId },
        // Legacy fields (backward compatibility)
        { recipients: 'all' },
        { 
          recipients: 'specific',
          targetUsers: userId
        },
        // Legacy compatibility
        { user: userId }
      ],
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment) {
      totalQuery.$or.push({ 
        department: userDepartment,
        broadcast: false,
        $or: [
          { recipient: { $exists: false } },
          { recipient: null }
        ]
      });
    }
    if (type) totalQuery.type = type;
    if (unreadOnly === 'true') {
      totalQuery['readBy.user'] = { $ne: userId };
    }

    // Use distinct to get accurate count without duplicates
    const distinctIds = await Notification.find(totalQuery).distinct('_id');
    const total = distinctIds.length;
    const totalPages = Math.ceil(total / limit);

    const response = {
      notifications: notificationsWithReadStatus || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
    
    console.log('Sending response with', response.notifications.length, 'notifications');
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Get notifications for current user
router.get('/my-notifications', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userDepartment = req.user.department;
    
    console.log('Fetching notifications for user:', userId, 'department:', userDepartment);
    
    const { 
      page = 1, 
      limit = 20, 
      type, 
      unreadOnly = false 
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      unreadOnly: unreadOnly === 'true'
    };

    console.log('Notification query options:', options);
    
    const notifications = await Notification.getForUser(userId, userDepartment, options);
    
    console.log('Found notifications:', notifications?.length || 0);
    
    // Ensure notifications is an array
    if (!Array.isArray(notifications)) {
      console.warn('Notifications is not an array:', typeof notifications);
      notifications = [];
    }
    
    // Convert userId to ObjectId for query consistency
    const mongoose = require('mongoose');
    let userIdObj = userId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }
    
    // Add read status for each notification (notifications are plain objects from lean())
    const notificationsWithReadStatus = (notifications || []).map(notification => {
      if (!notification || typeof notification !== 'object') {
        console.warn('Invalid notification object:', notification);
        return null;
      }
      
      const readEntry = notification.readBy?.find(read => {
        const readUserId = read.user?._id?.toString() || read.user?.toString() || read.user;
        return readUserId === userId.toString();
      });
      
      return {
        ...notification,
        isRead: !!readEntry,
        readAt: readEntry?.readAt || null
      };
    }).filter(n => n !== null); // Remove any null entries

    // Get total count for pagination (use same query logic as getForUser)
    const totalQuery = {
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
      ],
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

    if (userDepartment) {
      totalQuery.$or.push({ 
        department: userDepartment,
        broadcast: false,
        $or: [
          { recipient: { $exists: false } },
          { recipient: null }
        ]
      });
    }
    if (type) totalQuery.type = type;
    if (unreadOnly === 'true') {
      totalQuery['readBy.user'] = { $ne: userIdObj };
    }

    // Use distinct to get accurate count without duplicates
    const distinctIds = await Notification.find(totalQuery).distinct('_id');
    const total = distinctIds.length;
    const totalPages = Math.ceil(total / limit);

    const response = {
      notifications: notificationsWithReadStatus || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
    
    console.log('Sending response with', response.notifications.length, 'notifications');
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', verifyStudentOrAdmin, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const notification = await Notification.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ 
      message: 'Notification marked as read',
      notification: {
        ...notification.toObject(),
        isRead: true,
        readAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

// Mark all notifications as read for current user
router.put('/mark-all-read', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const userDepartment = req.user.department;

    // Find all unread notifications for the user
    const query = {
      status: 'active',
      'readBy.user': { $ne: userId },
      $or: [
        // New targeting fields (preferred)
        { broadcast: true },
        { recipient: userId },
        // Legacy fields (backward compatibility)
        { recipients: 'all' },
        { 
          recipients: 'specific',
          targetUsers: userId
        },
        // Legacy compatibility
        { user: userId }
      ]
    };

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

    const result = await Notification.updateMany(
      query,
      {
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', verifyStudentOrAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const userDepartment = req.user.department;

    const query = {
      status: 'active',
      'readBy.user': { $ne: userId },
      $or: [
        // New targeting fields (preferred)
        { broadcast: true },
        { recipient: userId },
        // Legacy fields (backward compatibility)
        { recipients: 'all' },
        { 
          recipients: 'specific',
          targetUsers: userId
        },
        // Legacy compatibility
        { user: userId }
      ],
      $and: [{
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }]
    };

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

    // Use distinct to get accurate count without duplicates
    const distinctIds = await Notification.find(query).distinct('_id');
    const count = distinctIds.length;

    res.json({ unreadCount: count });
    
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
});

// Admin routes - Create notification
router.post('/', verifyToken, async (req, res) => {
  try {
    // Only admin can create notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can create notifications' });
    }

    const {
      title,
      message,
      type = 'general',
      priority = 'medium',
      target, // New: 'user' | 'department' | 'all'
      userId, // For target: 'user'
      department, // For target: 'department'
      // Legacy support
      recipients,
      targetUsers = [],
      data = {},
      scheduledFor,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const User = require('../models/User');
    let notificationData = {
      title,
      message,
      type,
      priority,
      data,
      scheduledFor,
      expiresAt,
      createdBy: req.user.id,
      status: scheduledFor ? 'scheduled' : 'active'
    };

    // Handle new target format (preferred)
    if (target) {
      if (target === 'user') {
        if (!userId) {
          return res.status(400).json({ message: 'userId is required when target is "user"' });
        }
        // Find user by ID or studentID
        let user;
        if (mongoose.Types.ObjectId.isValid(userId)) {
          user = await User.findById(userId);
        } else {
          user = await User.findOne({ studentID: userId, role: 'student' });
        }
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        notificationData.recipient = user._id;
        notificationData.broadcast = false;
        notificationData.recipients = 'specific'; // Legacy compatibility
        notificationData.targetUsers = [user._id]; // Legacy compatibility
      } else if (target === 'department') {
        if (!department) {
          return res.status(400).json({ message: 'department is required when target is "department"' });
        }
        // Normalize department to canonical ID (e.g., "CSE" instead of "Computer Science Engineering")
        const normalizedDepartment = normalizeDepartment(department);
        if (!normalizedDepartment) {
          return res.status(400).json({ message: 'Invalid department specified' });
        }
        notificationData.department = normalizedDepartment;
        notificationData.broadcast = false;
        notificationData.recipient = null; // Explicitly set to null for department notifications
        notificationData.recipients = 'students'; // Legacy compatibility
      } else if (target === 'all') {
        notificationData.broadcast = true;
        notificationData.recipients = 'all'; // Legacy compatibility
      } else {
        return res.status(400).json({ message: 'Invalid target. Must be "user", "department", or "all"' });
      }
    } else {
      // Legacy format support
      notificationData.recipients = recipients || 'all';
      notificationData.targetUsers = targetUsers;
      notificationData.department = department;
      
      // Set broadcast and recipient based on legacy recipients field
      if (recipients === 'all') {
        notificationData.broadcast = true;
      } else if (recipients === 'specific' && targetUsers.length > 0) {
        notificationData.recipient = targetUsers[0]; // Use first target user
        notificationData.broadcast = false;
      } else if (recipients === 'students' && department) {
        // Normalize department for legacy format too
        const normalizedDepartment = normalizeDepartment(department);
        notificationData.department = normalizedDepartment || department;
        notificationData.broadcast = false;
        notificationData.recipient = null; // Explicitly set to null for department notifications
      } else {
        notificationData.broadcast = recipients === 'all';
      }
    }

    const notification = new Notification(notificationData);
    await notification.save();

    console.log('📝 Notification saved:', {
      id: notification._id,
      title: notification.title,
      target: target || recipients,
      recipient: notification.recipient,
      broadcast: notification.broadcast,
      department: notification.department,
      targetUsers: notification.targetUsers
    });

    // Send push notifications to targeted users (non-blocking)
    // Use async/await with proper error handling
    (async () => {
      try {
        console.log('🚀 Starting push notification send process...');
        const { sendPushNotificationForNotification } = require('../utils/pushNotifications');
        
        // Populate the notification if it has references
        let populatedNotification = notification;
        if (notification.recipient) {
          populatedNotification = await Notification.findById(notification._id)
            .populate('recipient', 'name studentID pushToken')
            .lean();
        }
        
        const result = await sendPushNotificationForNotification(populatedNotification || notification);
        
        if (result.success) {
          console.log(`✅ Push notifications sent successfully: ${result.sent || 0} users notified`);
          console.log(`✅ Notification: "${notification.title}" sent to ${result.sent || 0} users`);
        } else {
          console.error(`❌ Push notification failed: ${result.error || 'Unknown error'}`);
          if (result.errors) {
            console.error('❌ Push notification errors:', JSON.stringify(result.errors, null, 2));
          }
        }
      } catch (err) {
        console.error('❌ Error sending push notifications:', err);
        console.error('❌ Error stack:', err.stack);
        // Don't fail the request if push notification fails
      }
    })();

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
    
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
});

// Legacy route - keep for backward compatibility
const { createNotification, listNotifications } = require('../controllers/notificationController');
router.post('/legacy', verifyToken, createNotification);
router.get('/legacy', verifyToken, listNotifications);

// Get all notifications (admin route)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Only admin can view all notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can view all notifications' });
    }

    const { 
      page = 1, 
      limit = 20, 
      type, 
      status,
      priority,
      recipients
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (recipients) query.recipients = recipients;

    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('targetUsers', 'name email studentID')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Get individual notification by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('targetUsers', 'name email studentID');
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
    
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ message: 'Failed to fetch notification', error: error.message });
  }
});

// Admin routes - Get all notifications with filters
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    // Only admin can view all notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can view all notifications' });
    }

    const { 
      page = 1, 
      limit = 20, 
      type, 
      status,
      priority,
      recipients
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (recipients) query.recipients = recipients;

    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('targetUsers', 'name email studentID')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Delete all notifications (admin only) - MUST be before /:id route
router.delete('/all', verifyToken, async (req, res) => {
  try {
    // Only admin can delete all notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete all notifications' });
    }

    return deleteAllNotifications(req, res);
    
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Failed to delete all notifications', error: error.message });
  }
});

// Delete notification (admin only) - MUST be after /all route
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Only admin can delete notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete notifications' });
    }

    const notificationId = req.params.id;
    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

module.exports = router;


