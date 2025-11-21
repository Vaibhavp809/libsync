const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Send push notification to a single user
 * @param {String} pushToken - Expo push token
 * @param {String} title - Notification title
 * @param {String} body - Notification message
 * @param {Object} data - Additional data for the notification
 * @param {String} channelId - Android notification channel (optional)
 */
async function sendPushNotification(pushToken, title, body, data = {}, channelId = 'default') {
  try {
    // Check that all push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return { success: false, error: 'Invalid push token' };
    }

    // Construct the message
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: channelId, // Android notification channel
    };

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors
    const errors = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error') {
        errors.push({
          token: pushToken,
          error: ticket.message || 'Unknown error'
        });
        console.error(`Push notification error for token ${pushToken}:`, ticket.message);
      }
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, ticket: tickets[0] };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 * @param {Array<String>} pushTokens - Array of Expo push tokens
 * @param {String} title - Notification title
 * @param {String} body - Notification message
 * @param {Object} data - Additional data for the notification
 * @param {String} channelId - Android notification channel (optional)
 */
async function sendPushNotificationsToMultiple(pushTokens, title, body, data = {}, channelId = 'default') {
  try {
    // Filter out invalid tokens
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validTokens.length === 0) {
      console.warn('No valid push tokens provided');
      return { success: false, error: 'No valid push tokens' };
    }

    // Construct messages
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: channelId,
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Check for errors
    const errors = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error') {
        errors.push({
          token: validTokens[i],
          error: ticket.message || 'Unknown error'
        });
      }
    });

    return {
      success: errors.length === 0,
      sent: validTokens.length - errors.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to users based on notification targeting
 * @param {Object} notification - Notification document
 */
async function sendPushNotificationForNotification(notification) {
  try {
    console.log('📤 Attempting to send push notification for:', {
      title: notification.title,
      type: notification.type,
      broadcast: notification.broadcast,
      recipients: notification.recipients,
      recipient: notification.recipient,
      targetUsers: notification.targetUsers,
      department: notification.department
    });

    let targetUsers = [];
    let channelId = 'default';

    // Determine channel based on notification type
    switch (notification.type) {
      case 'reservation':
        channelId = 'reservations';
        break;
      case 'due_date':
        channelId = 'due_dates';
        break;
      case 'announcement':
        channelId = 'announcements';
        break;
      case 'urgent':
        channelId = 'urgent';
        break;
      default:
        channelId = 'default';
    }

    // Determine target users
    // Check both new 'broadcast' field and legacy 'recipients' field
    const isBroadcast = notification.broadcast === true || notification.recipients === 'all';
    
    if (isBroadcast) {
      // Get all students with push tokens
      targetUsers = await User.find({
        role: 'student',
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} students with push tokens for 'all' notification`);
    } else if (notification.recipients === 'students' && notification.department) {
      // Get students in specific department with push tokens
      targetUsers = await User.find({
        role: 'student',
        department: notification.department,
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} students with push tokens in department ${notification.department}`);
    } else if (notification.recipients === 'specific' && notification.targetUsers && notification.targetUsers.length > 0) {
      // Get specific users with push tokens
      targetUsers = await User.find({
        _id: { $in: notification.targetUsers },
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} specific users with push tokens out of ${notification.targetUsers.length} target users`);
    } else if (notification.recipient) {
      // Single recipient - handle both ObjectId and string
      const recipientId = notification.recipient._id || notification.recipient;
      const user = await User.findById(recipientId).select('pushToken name studentID');
      if (user && user.pushToken) {
        targetUsers = [user];
        console.log(`Found single recipient with push token: ${user.name || user.studentID}`);
      } else {
        console.log(`Single recipient ${recipientId} has no push token`);
      }
    } else {
      console.warn('⚠️ No valid targeting found for notification:', {
        broadcast: notification.broadcast,
        recipients: notification.recipients,
        recipient: notification.recipient,
        targetUsers: notification.targetUsers,
        department: notification.department
      });
    }

    if (targetUsers.length === 0) {
      console.warn('⚠️ No users with push tokens found for notification');
      return { success: false, error: 'No users with push tokens' };
    }

    // Extract push tokens
    const pushTokens = targetUsers
      .map(user => user.pushToken)
      .filter(token => token && token.trim() !== '');

    if (pushTokens.length === 0) {
      console.warn('⚠️ No valid push tokens found after filtering');
      return { success: false, error: 'No valid push tokens' };
    }

    console.log(`📱 Sending push notifications to ${pushTokens.length} users via channel: ${channelId}`);

    // Send notifications
    const result = await sendPushNotificationsToMultiple(
      pushTokens,
      notification.title,
      notification.message,
      {
        notificationId: notification._id.toString(),
        type: notification.type,
        priority: notification.priority,
        ...notification.data
      },
      channelId
    );

    if (result.success) {
      console.log(`✅ Push notification sent successfully to ${result.sent || 0} users for notification: ${notification.title}`);
    } else {
      console.error(`❌ Push notification failed: ${result.error || 'Unknown error'}`);
      if (result.errors) {
        console.error('Push notification errors:', result.errors);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending push notification for notification:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotificationsToMultiple,
  sendPushNotificationForNotification
};

