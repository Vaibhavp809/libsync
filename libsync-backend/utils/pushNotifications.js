const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const PushNotificationLog = require('../models/PushNotificationLog');

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
      // Ensure notification shows on lock screen
      android: {
        priority: 'high',
        channelId: channelId,
        visibility: 'public', // Show on lock screen
        sound: 'default',
        vibrate: [250, 250, 250],
      },
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
      return { success: false, errors, ticket: tickets[0] || null };
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
    console.log(`📤 sendPushNotificationsToMultiple called with ${pushTokens.length} tokens`);
    console.log(`📤 Title: "${title}"`);
    console.log(`📤 Body: "${body}"`);
    console.log(`📤 Channel: ${channelId}`);
    
    // Filter out invalid tokens
    const validTokens = pushTokens.filter(token => {
      const isValid = Expo.isExpoPushToken(token);
      if (!isValid) {
        console.warn(`⚠️ Invalid token filtered out: ${token.substring(0, 30)}...`);
      }
      return isValid;
    });
    
    console.log(`📤 Valid tokens: ${validTokens.length} out of ${pushTokens.length}`);
    
    if (validTokens.length === 0) {
      console.error('❌ No valid push tokens provided after filtering');
      console.error('❌ All tokens were invalid Expo push tokens');
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
      // Ensure notification shows on lock screen
      android: {
        priority: 'high',
        channelId: channelId,
        visibility: 'public', // Show on lock screen
        sound: 'default',
        vibrate: [250, 250, 250],
      },
    }));

    console.log(`📤 Constructed ${messages.length} notification messages`);
    console.log(`📤 First message preview:`, {
      to: messages[0].to.substring(0, 30) + '...',
      title: messages[0].title,
      body: messages[0].body.substring(0, 50) + '...',
      channelId: messages[0].channelId
    });

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    console.log(`📤 Split into ${chunks.length} chunks for sending`);
    
    const tickets = [];
    const tokenToIndexMap = {}; // Map tokens to their index in validTokens array
    validTokens.forEach((token, index) => {
      tokenToIndexMap[token] = index;
    });

    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(`📤 Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} notifications)...`);
        const ticketChunk = await expo.sendPushNotificationsAsync(chunks[i]);
        tickets.push(...ticketChunk);
        console.log(`✅ Chunk ${i + 1} sent successfully`);
      } catch (error) {
        console.error(`❌ Error sending push notification chunk ${i + 1}:`, error);
        console.error(`❌ Error message:`, error.message);
        console.error(`❌ Error stack:`, error.stack);
      }
    }

    console.log(`📤 Received ${tickets.length} tickets from Expo`);

    // Check for errors and create error mapping
    const errors = [];
    const ticketResults = {}; // Map token to ticket result
    tickets.forEach((ticket, i) => {
      const token = validTokens[i];
      if (ticket.status === 'error') {
        const errorEntry = {
          token: token,
          error: ticket.message || 'Unknown error'
        };
        errors.push(errorEntry);
        ticketResults[token] = { status: 'error', error: errorEntry.error, ticket: ticket };
        console.error(`❌ Ticket error for token ${i}:`, ticket.message || 'Unknown error');
      } else {
        ticketResults[token] = { status: 'success', ticket: ticket };
        console.log(`✅ Ticket ${i} status: ${ticket.status} (ID: ${ticket.id || 'N/A'})`);
      }
    });

    const result = {
      success: errors.length === 0,
      sent: validTokens.length - errors.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      ticketResults: ticketResults // Include ticket results for logging
    };

    console.log(`📤 ========== PUSH NOTIFICATION RESULT ==========`);
    console.log(`📤 Success: ${result.success}`);
    console.log(`📤 Sent: ${result.sent}`);
    console.log(`📤 Failed: ${result.failed}`);
    if (result.errors) {
      console.error(`📤 Errors:`, JSON.stringify(result.errors, null, 2));
    }
    console.log(`📤 =============================================`);

    return result;
  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to users based on notification targeting
 * @param {Object} notification - Notification document
 */
async function sendPushNotificationForNotification(notification) {
  try {
    // Convert Mongoose document to plain object if needed
    const notificationObj = notification.toObject ? notification.toObject() : notification;
    
    console.log('📤 ========== PUSH NOTIFICATION START ==========');
    console.log('📤 Attempting to send push notification for:', {
      notificationId: notificationObj._id || notificationObj.id,
      title: notificationObj.title,
      message: notificationObj.message,
      type: notificationObj.type,
      broadcast: notificationObj.broadcast,
      recipients: notificationObj.recipients,
      recipient: notificationObj.recipient,
      recipientId: notificationObj.recipient?._id || notificationObj.recipient,
      targetUsers: notificationObj.targetUsers,
      department: notificationObj.department
    });

    let targetUsers = [];
    let channelId = 'default';

    // Use the converted object
    const notif = notificationObj;
    
    // Determine channel based on notification type
    switch (notif.type) {
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
    const isBroadcast = notif.broadcast === true || notif.recipients === 'all';
    
    if (isBroadcast) {
      // Get all students with push tokens
      targetUsers = await User.find({
        role: 'student',
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} students with push tokens for 'all' notification`);
    } else if (notif.recipients === 'students' && notif.department) {
      // Get students in specific department with push tokens
      targetUsers = await User.find({
        role: 'student',
        department: notif.department,
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} students with push tokens in department ${notif.department}`);
    } else if (notif.recipients === 'specific' && notif.targetUsers && notif.targetUsers.length > 0) {
      // Get specific users with push tokens
      targetUsers = await User.find({
        _id: { $in: notif.targetUsers },
        pushToken: { $exists: true, $ne: null, $ne: '' }
      }).select('pushToken name studentID');
      console.log(`Found ${targetUsers.length} specific users with push tokens out of ${notif.targetUsers.length} target users`);
    } else if (notif.recipient) {
      // Single recipient - handle both ObjectId and string
      const recipientId = notif.recipient._id || notif.recipient || notif.recipient.toString();
      console.log(`🔍 Looking for single recipient with ID: ${recipientId}`);
      
      const user = await User.findById(recipientId).select('pushToken name studentID email');
      console.log(`🔍 User found:`, {
        found: !!user,
        hasPushToken: !!(user && user.pushToken),
        name: user?.name,
        studentID: user?.studentID,
        pushTokenPreview: user?.pushToken ? user.pushToken.substring(0, 30) + '...' : 'none'
      });
      
      if (user && user.pushToken) {
        targetUsers = [user];
        console.log(`✅ Found single recipient with push token: ${user.name || user.studentID || user.email}`);
      } else {
        console.warn(`⚠️ Single recipient ${recipientId} has no push token`);
        if (user) {
          console.warn(`⚠️ User exists but pushToken is: ${user.pushToken || 'null/undefined'}`);
        } else {
          console.warn(`⚠️ User with ID ${recipientId} not found`);
        }
      }
    } else {
      console.warn('⚠️ No valid targeting found for notification:', {
        broadcast: notif.broadcast,
        recipients: notif.recipients,
        recipient: notif.recipient,
        targetUsers: notif.targetUsers,
        department: notif.department
      });
    }

    if (targetUsers.length === 0) {
      console.error('❌ No users with push tokens found for notification');
      console.error('❌ Notification targeting:', {
        broadcast: notif.broadcast,
        recipients: notif.recipients,
        recipient: notif.recipient,
        targetUsers: notif.targetUsers,
        department: notif.department
      });
      return { success: false, error: 'No users with push tokens' };
    }

    // Extract push tokens
    const pushTokens = targetUsers
      .map(user => user.pushToken)
      .filter(token => token && token.trim() !== '');

    console.log(`📋 Extracted ${pushTokens.length} valid push tokens from ${targetUsers.length} target users`);

    if (pushTokens.length === 0) {
      console.error('❌ No valid push tokens found after filtering');
      console.error('❌ Target users:', targetUsers.map(u => ({
        name: u.name,
        studentID: u.studentID,
        hasPushToken: !!u.pushToken,
        pushTokenLength: u.pushToken?.length || 0
      })));
      return { success: false, error: 'No valid push tokens' };
    }

    console.log(`📱 Sending push notifications to ${pushTokens.length} users via channel: ${channelId}`);
    console.log(`📱 First token preview: ${pushTokens[0].substring(0, 30)}...`);

    // Send notifications
    const result = await sendPushNotificationsToMultiple(
      pushTokens,
      notif.title,
      notif.message,
      {
        notificationId: (notif._id || notif.id).toString(),
        type: notif.type,
        priority: notif.priority,
        ...(notif.data || {})
      },
      channelId
    );

    // Create log entry for push notification attempt
    try {
      // Map recipients with their send status
      const recipientEntries = targetUsers.map((user) => {
        const userToken = user.pushToken;
        const tokenIndex = pushTokens.findIndex(t => t === userToken);
        let status = 'sent';
        let error = null;
        let ticketId = null;

        // Check if this token had an error
        if (result.errors && result.errors.length > 0) {
          const tokenError = result.errors.find(e => e.token === userToken);
          if (tokenError) {
            status = tokenError.error === 'Invalid push token' ? 'invalid_token' : 'failed';
            error = tokenError.error;
          }
        }

        // Get ticket ID if available
        if (result.ticketResults && result.ticketResults[userToken] && result.ticketResults[userToken].ticket) {
          ticketId = result.ticketResults[userToken].ticket.id;
        }

        return {
          userId: user._id,
          userEmail: user.email || null,
          userName: user.name || null,
          studentID: user.studentID || null,
          pushToken: userToken ? userToken.substring(0, 30) + '...' : null, // Only log partial token for security
          status: status,
          error: error,
          ticketId: ticketId
        };
      });

      const logEntry = {
        notificationId: notif._id || notif.id,
        notificationTitle: notif.title,
        notificationMessage: notif.message,
        notificationType: notif.type,
        priority: notif.priority || 'medium',
        channelId: channelId,
        recipients: recipientEntries,
        totalRecipients: targetUsers.length,
        successfulSends: result.sent || 0,
        failedSends: result.failed || 0,
        invalidTokens: result.errors?.filter(e => e.error === 'Invalid push token').length || 0,
        status: result.success ? (result.failed > 0 ? 'partial' : 'sent') : 'failed',
        error: result.error || null,
        sentBy: notif.createdBy || null
      };

      await PushNotificationLog.create(logEntry);
      console.log(`✅ Push notification log created: ${logEntry.status} - ${logEntry.successfulSends} sent, ${logEntry.failedSends} failed`);
    } catch (logError) {
      console.error('⚠️ Failed to create push notification log:', logError.message);
      console.error('Log error details:', logError);
      // Don't fail the notification send if logging fails
    }

    if (result.success) {
      console.log(`✅ Push notification sent successfully to ${result.sent || 0} users for notification: ${notif.title}`);
    } else {
      console.error(`❌ Push notification failed: ${result.error || 'Unknown error'}`);
      if (result.errors) {
        console.error('Push notification errors:', result.errors);
      }
    }

    console.log('📤 ========== PUSH NOTIFICATION END ==========');
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

