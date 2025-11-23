const Setting = require('../models/Setting');

const getSingleton = async () => {
  let doc = await Setting.findOne();
  if (!doc) doc = await Setting.create({});
  return doc;
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { loanDurationDays, attendanceQrExpiryHours, attendanceQrExpiryMinutes, emailTemplates } = req.body;
    const current = await getSingleton();
    if (loanDurationDays !== undefined) current.loanDurationDays = loanDurationDays;
    // Support both new (hours) and legacy (minutes) format for migration
    if (attendanceQrExpiryHours !== undefined) {
      current.attendanceQrExpiryHours = attendanceQrExpiryHours;
    } else if (attendanceQrExpiryMinutes !== undefined) {
      // Convert legacy minutes to hours (migrate old data)
      current.attendanceQrExpiryHours = attendanceQrExpiryMinutes / 60;
    }
    if (emailTemplates !== undefined) current.emailTemplates = emailTemplates;
    await current.save();
    res.json(current);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


