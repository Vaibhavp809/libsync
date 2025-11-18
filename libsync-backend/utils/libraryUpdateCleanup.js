const cron = require('node-cron');
const LibraryUpdate = require('../models/LibraryUpdate');

// Schedule weekly cleanup of expired library updates
// Runs every Sunday at 2 AM
const scheduleLibraryUpdateCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    try {
      console.log('Starting library updates cleanup...');
      
      const result = await LibraryUpdate.cleanupExpired();
      
      console.log(`Library updates cleanup completed. ${result.deletedCount} expired updates removed.`);
    } catch (error) {
      console.error('Error during library updates cleanup:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log('📚 Weekly library updates cleanup scheduled (Sundays at 2 AM)');
};

module.exports = { scheduleLibraryUpdateCleanup };