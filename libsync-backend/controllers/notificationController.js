const Notification = require('../models/Notification');
const User = require('../models/User');

exports.createNotification = async (req, res) => {
  try {
    const { title, message, audienceType, department, studentID, type } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'title and message are required' });

    // Determine recipients (IDs) based on audience
    let recipients = [];
    if (audienceType === 'all') {
      recipients = (await User.find({ role: 'student' }, '_id')).map(u => u._id);
    } else if (audienceType === 'department' && department) {
      recipients = (await User.find({ role: 'student', department }, '_id')).map(u => u._id);
    } else if (audienceType === 'student' && studentID) {
      const user = await User.findOne({ role: 'student', studentID });
      if (user) recipients = [user._id];
    }

    // Save one notification per recipient (simple approach for in-app)
    const docs = await Notification.insertMany(
      recipients.map(userId => ({ user: userId, message: `${title}\n${message}`, type: type || 'app' }))
    );

    res.status(201).json({ count: docs.length });
  } catch (err) {
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


