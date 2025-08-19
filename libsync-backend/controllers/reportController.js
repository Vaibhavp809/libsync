const Attendance = require('../models/Attendance');
const Loan = require('../models/Loan');

const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

exports.attendanceCsv = async (req, res) => {
  try {
    const records = await Attendance.find().populate('student');
    const rows = records.map(r => ({
      date: r.date?.toISOString() || '',
      loginTime: r.loginTime?.toISOString() || '',
      logoutTime: r.logoutTime ? r.logoutTime.toISOString() : '',
      status: r.status,
      studentName: r.student?.name || '',
      studentEmail: r.student?.email || '',
      studentID: r.student?.studentID || '',
      department: r.student?.department || '',
    }));
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loansCsv = async (req, res) => {
  try {
    const loans = await Loan.find().populate('book').populate('student');
    const rows = loans.map(l => ({
      bookTitle: l.book?.title || '',
      studentName: l.student?.name || '',
      studentEmail: l.student?.email || '',
      studentID: l.student?.studentID || '',
      issueDate: l.issueDate?.toISOString() || '',
      dueDate: l.dueDate?.toISOString() || '',
      returnDate: l.returnDate ? l.returnDate.toISOString() : '',
      status: l.status,
    }));
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="loans.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


