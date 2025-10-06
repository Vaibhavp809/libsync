const Attendance = require('../models/Attendance');
const Loan = require('../models/Loan');

const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  
  // Custom headers mapping
  const headerMapping = {
    date: 'Date',
    loginTime: 'Login Time (IST)',
    logoutTime: 'Logout Time (IST)',
    status: 'Status',
    studentName: 'Student Name',
    studentEmail: 'Email',
    studentID: 'Student ID',
    department: 'Department'
  };
  
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };
  
  const headerLine = headers.map(h => headerMapping[h] || h).join(',');
  const dataLines = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
};

const formatToIST = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

exports.attendanceCsv = async (req, res) => {
  try {
    const records = await Attendance.find().populate('student');
    const rows = records.map(r => ({
      date: r.date ? formatToIST(r.date).split(',')[0] : '',
      loginTime: formatToIST(r.loginTime),
      logoutTime: r.logoutTime ? formatToIST(r.logoutTime) : '',
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


