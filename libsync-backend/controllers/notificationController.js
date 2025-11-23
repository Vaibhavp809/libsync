const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotificationForNotification } = require('../utils/pushNotifications');

exports.createNotification = async (req, res) => {
  try {
    const { title, message, audienceType, department, studentID, type, priority = 'medium' } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'title and message are required' });

    let notificationData = {
      title,
      message,
      type: type || 'general',
      priority,
      createdBy: req.user.id,
      status: 'active'
    };

    // Determine recipients and targeting based on audience
    if (audienceType === 'all') {
      notificationData.recipients = 'all';
    } else if (audienceType === 'department' && department) {
      notificationData.recipients = 'students';
      notificationData.department = department;
    } else if (audienceType === 'student' && studentID) {
      const user = await User.findOne({ role: 'student', studentID });
      if (!user) {
        return res.status(404).json({ message: `Student with ID ${studentID} not found` });
      }
      notificationData.recipients = 'specific';
      notificationData.targetUsers = [user._id];
    } else {
      return res.status(400).json({ message: 'Invalid audienceType or missing required parameters' });
    }

    // Create single notification with proper targeting
    const notification = new Notification(notificationData);
    await notification.save();

    // Send push notifications to targeted users (non-blocking)
    (async () => {
      try {
        console.log('🚀 Starting push notification send process for notification:', notification._id);
        const result = await sendPushNotificationForNotification(notification);
        if (result.success) {
          console.log(`✅ Push notifications sent: ${result.sent || 0} users notified`);
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
      notification,
      targetCount: audienceType === 'all' ? 'all students' :
                   audienceType === 'department' ? `${department} department` :
                   '1 student'
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.listNotifications = async (req, res) => {
  try {
    const list = await Notification.find().populate('user').sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    
    res.json({ 
      message: 'All notifications deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error deleting all notifications:', err);
    res.status(500).json({ message: err.message });
  }
};


