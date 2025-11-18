const mongoose = require('mongoose');
const Notification = require('../models/Notification');

async function cleanupDuplicateNotifications() {
  try {
    console.log('Starting notification cleanup...');
    
    // Find all notifications that use the old system (have 'user' field)
    const oldNotifications = await Notification.find({ 
      user: { $exists: true },
      recipients: { $exists: false } 
    }).populate('user', 'name email studentID');
    
    console.log(`Found ${oldNotifications.length} old notifications to process`);
    
    // Group notifications by message content and creation time (within 1 minute)
    const groups = {};
    
    for (const notification of oldNotifications) {
      const key = `${notification.message}_${Math.floor(notification.createdAt.getTime() / 60000)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    }
    
    console.log(`Found ${Object.keys(groups).length} notification groups`);
    
    let migratedCount = 0;
    let deletedCount = 0;
    
    for (const [key, notificationGroup] of Object.entries(groups)) {
      if (notificationGroup.length === 1) {
        // Single notification - just migrate to new format
        const oldNotif = notificationGroup[0];
        await Notification.findByIdAndUpdate(oldNotif._id, {
          recipients: 'specific',
          targetUsers: [oldNotif.user],
          title: oldNotif.message.split('\n')[0] || 'Notification',
          message: oldNotif.message.split('\n').slice(1).join('\n') || oldNotif.message,
          type: oldNotif.type || 'general',
          priority: 'medium',
          status: 'active',
          $unset: { user: 1 }
        });
        migratedCount++;
      } else {
        // Multiple notifications - create one new notification and delete old ones
        const firstNotif = notificationGroup[0];
        const targetUsers = notificationGroup.map(n => n.user);
        
        // Create new notification with proper targeting
        const newNotification = new Notification({
          title: firstNotif.message.split('\n')[0] || 'Notification',
          message: firstNotif.message.split('\n').slice(1).join('\n') || firstNotif.message,
          type: firstNotif.type || 'general',
          priority: 'medium',
          recipients: targetUsers.length > 10 ? 'all' : 'specific',
          targetUsers: targetUsers.length > 10 ? [] : targetUsers,
          status: 'active',
          createdBy: firstNotif.createdBy || null,
          createdAt: firstNotif.createdAt
        });
        
        await newNotification.save();
        migratedCount++;
        
        // Delete all old notifications in this group
        const idsToDelete = notificationGroup.map(n => n._id);
        await Notification.deleteMany({ _id: { $in: idsToDelete } });
        deletedCount += idsToDelete.length;
        
        console.log(`Migrated group with ${notificationGroup.length} duplicates`);
      }
    }
    
    console.log(`Cleanup complete:`);
    console.log(`- Migrated: ${migratedCount} notifications`);
    console.log(`- Deleted: ${deletedCount} duplicate notifications`);
    
    // Verify the cleanup
    const remainingOldNotifications = await Notification.countDocuments({ 
      user: { $exists: true },
      recipients: { $exists: false }
    });
    
    console.log(`Remaining old notifications: ${remainingOldNotifications}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB().then(() => {
    cleanupDuplicateNotifications().then(() => {
      process.exit(0);
    }).catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
  });
}

module.exports = cleanupDuplicateNotifications;