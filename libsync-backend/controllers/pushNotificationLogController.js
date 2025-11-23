const PushNotificationLog = require('../models/PushNotificationLog');

/**
 * Get push notification logs with pagination
 */
exports.getPushNotificationLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      notificationType,
      startDate,
      endDate,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (notificationType && notificationType !== 'all') {
      filter.notificationType = notificationType;
    }

    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) {
        filter.sentAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        filter.sentAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { notificationTitle: { $regex: search, $options: 'i' } },
        { notificationMessage: { $regex: search, $options: 'i' } }
      ];
    }

    // Get logs with pagination
    const logs = await PushNotificationLog.find(filter)
      .populate('notificationId', 'title message type')
      .populate('sentBy', 'name email')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await PushNotificationLog.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalLogs: total,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching push notification logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch push notification logs',
      error: error.message
    });
  }
};

/**
 * Get a single push notification log by ID
 */
exports.getPushNotificationLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await PushNotificationLog.findById(id)
      .populate('notificationId', 'title message type')
      .populate('sentBy', 'name email')
      .populate('recipients.userId', 'name email studentID');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Push notification log not found'
      });
    }

    res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error fetching push notification log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch push notification log',
      error: error.message
    });
  }
};

/**
 * Get push notification statistics
 */
exports.getPushNotificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.sentAt = {};
      if (startDate) {
        dateFilter.sentAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.sentAt.$lte = end;
      }
    }

    // Get total counts
    const totalLogs = await PushNotificationLog.countDocuments(dateFilter);
    const successfulLogs = await PushNotificationLog.countDocuments({
      ...dateFilter,
      status: 'sent'
    });
    const partialLogs = await PushNotificationLog.countDocuments({
      ...dateFilter,
      status: 'partial'
    });
    const failedLogs = await PushNotificationLog.countDocuments({
      ...dateFilter,
      status: 'failed'
    });

    // Get aggregate stats
    const stats = await PushNotificationLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$successfulSends' },
          totalFailed: { $sum: '$failedSends' },
          totalInvalidTokens: { $sum: '$invalidTokens' },
          totalRecipients: { $sum: '$totalRecipients' }
        }
      }
    ]);

    const aggregateStats = stats[0] || {
      totalSent: 0,
      totalFailed: 0,
      totalInvalidTokens: 0,
      totalRecipients: 0
    };

    // Get stats by type
    const statsByType = await PushNotificationLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$notificationType',
          count: { $sum: 1 },
          totalSent: { $sum: '$successfulSends' },
          totalFailed: { $sum: '$failedSends' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalLogs,
        successfulLogs,
        partialLogs,
        failedLogs,
        totalSent: aggregateStats.totalSent,
        totalFailed: aggregateStats.totalFailed,
        totalInvalidTokens: aggregateStats.totalInvalidTokens,
        totalRecipients: aggregateStats.totalRecipients,
        statsByType
      }
    });
  } catch (error) {
    console.error('Error fetching push notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch push notification statistics',
      error: error.message
    });
  }
};

