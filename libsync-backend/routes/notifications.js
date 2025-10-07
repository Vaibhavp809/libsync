const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { verifyStudentOrAdmin } = require('../middleware/studentAuth');
const Notification = require('../models/Notification');

// Get notifications for current user
router.get('/my-notifications', verifyStudentOrAdmin, async (req, res) => {
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
    
    // Add read status for each notification
    const notificationsWithReadStatus = notifications.map(notification => ({
      ...notification.toObject(),
      isRead: notification.isReadByUser(userId),
      readAt: notification.readBy.find(read => read.user.toString() === userId.toString())?.readAt
    }));

    // Get total count for pagination
    const totalQuery = {
      status: 'active',
      $or: [
        { recipients: 'all' },
        { recipients: 'students' },
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
      totalQuery.$or.push({ department: userDepartment });
    }
    if (type) totalQuery.type = type;
    if (unreadOnly === 'true') {
      totalQuery['readBy.user'] = { $ne: userId };
    }

    const total = await Notification.countDocuments(totalQuery);
    const totalPages = Math.ceil(total / limit);

    res.json({
      notifications: notificationsWithReadStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
        { recipients: 'all' },
        { recipients: 'students' },
        { 
          recipients: 'specific',
          targetUsers: userId
        },
        // Legacy compatibility
        { user: userId }
      ]
    };

    if (userDepartment) {
      query.$or.push({ department: userDepartment });
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
        { recipients: 'all' },
        { recipients: 'students' },
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
      query.$or.push({ department: userDepartment });
    }

    const count = await Notification.countDocuments(query);

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
      recipients = 'all',
      targetUsers = [],
      department,
      data = {},
      scheduledFor,
      expiresAt
    } = req.body;

    const notification = new Notification({
      title,
      message,
      type,
      priority,
      recipients,
      targetUsers,
      department,
      data,
      scheduledFor,
      expiresAt,
      createdBy: req.user.id,
      status: scheduledFor ? 'scheduled' : 'active'
    });

    await notification.save();

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

module.exports = router;


