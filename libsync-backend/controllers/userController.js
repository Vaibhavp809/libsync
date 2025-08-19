const User = require('../models/User');

exports.listStudents = async (req, res) => {
  try {
    const { department, studentID, name, email, q } = req.query;
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (studentID) filter.studentID = studentID;
    if (name) filter.name = new RegExp(name, 'i');
    if (email) filter.email = new RegExp(email, 'i');
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { studentID: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
      ];
    }
    const students = await User.find(filter).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email, studentID, department } = req.body;
    if (!name || !email || !studentID) {
      return res.status(400).json({ message: 'name, email and studentID are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const student = await User.create({ name, email, studentID, department, role: 'student', password: '' });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentID, department } = req.body;
    const updated = await User.findOneAndUpdate(
      { _id: id, role: 'student' },
      { name, email, studentID, department },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Student not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'student' });
    if (!deleted) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


