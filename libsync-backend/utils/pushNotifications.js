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
    if (notification.recipients === 'all') {
      // Get all students with push tokens
      targetUsers = await User.find({
        role: 'student',
        pushToken: { $exists: true, $ne: null }
      }).select('pushToken');
    } else if (notification.recipients === 'students' && notification.department) {
      // Get students in specific department with push tokens
      targetUsers = await User.find({
        role: 'student',
        department: notification.department,
        pushToken: { $exists: true, $ne: null }
      }).select('pushToken');
    } else if (notification.recipients === 'specific' && notification.targetUsers) {
      // Get specific users with push tokens
      targetUsers = await User.find({
        _id: { $in: notification.targetUsers },
        pushToken: { $exists: true, $ne: null }
      }).select('pushToken');
    } else if (notification.recipient) {
      // Single recipient
      const user = await User.findById(notification.recipient).select('pushToken');
      if (user && user.pushToken) {
        targetUsers = [user];
      }
    }

    if (targetUsers.length === 0) {
      console.log('No users with push tokens found for notification');
      return { success: false, error: 'No users with push tokens' };
    }

    // Extract push tokens
    const pushTokens = targetUsers
      .map(user => user.pushToken)
      .filter(token => token && token.trim() !== '');

    if (pushTokens.length === 0) {
      console.log('No valid push tokens found');
      return { success: false, error: 'No valid push tokens' };
    }

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

    console.log(`Push notification sent to ${result.sent || 0} users for notification: ${notification.title}`);
    return result;
  } catch (error) {
    console.error('Error sending push notification for notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotificationsToMultiple,
  sendPushNotificationForNotification
};

