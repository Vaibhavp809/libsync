const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const DailyCode = require('../models/DailyCode');

// Generate a new daily token
const generateDailyToken = () => {
  return uuidv4().replace(/-/g, '').substring(0, 16);
};

// Get or create today's QR code
const getTodayQRCode = async () => {
  try {
    const Setting = require('../models/Setting');
    
    // Get settings for QR expiry
    const settings = await Setting.findOne() || {};
    const expiryHours = settings.attendanceQrExpiryHours || 24; // Default to 24 hours if not set
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    // Check if today's code already exists and is still valid
    let dailyCode = await DailyCode.findOne({ 
      date: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      isActive: true
    });
    
    // If code exists, check if it's expired based on settings
    if (dailyCode) {
      const now = new Date();
      const codeGeneratedAt = dailyCode.generatedAt || dailyCode.createdAt || dailyCode.date;
      const codeAge = now - new Date(codeGeneratedAt);
      const expiryMs = expiryHours * 60 * 60 * 1000;
      
      // If expired, mark as inactive and create new one
      if (codeAge > expiryMs) {
        dailyCode.isActive = false;
        await dailyCode.save();
        dailyCode = null; // Will create new one below
        console.log(`QR code expired (${expiryHours} hours). Generating new code.`);
      }
    }
    
    // If no valid code exists, create one
    if (!dailyCode) {
      const token = generateDailyToken();
      dailyCode = new DailyCode({
        date: today,
        token: token,
        isActive: true,
        generatedAt: new Date()
      });
      await dailyCode.save();
      console.log(`Generated new daily QR code for ${today.toDateString()} (valid for ${expiryHours} hours)`);
    }
    
    return dailyCode;
  } catch (error) {
    console.error('Error getting today\'s QR code:', error);
    throw error;
  }
};

// Generate QR code image as data URL
const generateQRImage = async (token) => {
  try {
    const qrDataURL = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR image:', error);
    throw error;
  }
};

// Clean up expired codes (run daily)
const cleanupExpiredCodes = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const result = await DailyCode.updateMany(
      { date: { $lt: yesterday } },
      { isActive: false }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Deactivated ${result.modifiedCount} expired daily codes`);
    }
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
  }
};

// Schedule daily cleanup (optional - can be called manually)
const scheduleCleanup = () => {
  // Run cleanup every day at 1 AM
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(1, 0, 0, 0);
  
  const timeUntilCleanup = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanupExpiredCodes();
    // Schedule next cleanup
    setInterval(cleanupExpiredCodes, 24 * 60 * 60 * 1000);
  }, timeUntilCleanup);
};

module.exports = {
  generateDailyToken,
  getTodayQRCode,
  generateQRImage,
  cleanupExpiredCodes,
  scheduleCleanup
};
