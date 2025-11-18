const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { normalizeDepartment, getDepartmentName } = require("../utils/departments");

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, studentID, department } = req.body;

    // Check if user already exists by email or student ID
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) return res.status(400).json({ message: "User with this email already exists" });
    
    const existingUserByStudentID = await User.findOne({ studentID });
    if (existingUserByStudentID) return res.status(400).json({ message: "User with this Student ID already exists" });

    // Normalize department to canonical ID
    const normalizedDepartment = normalizeDepartment(department);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role, 
      studentID, 
      department: normalizedDepartment 
    });

    await user.save();
    
    // Generate token for immediate login after registration
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });
    
    // Return token and user data (excluding password)
    // Include both department ID and name for frontend convenience
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentID: user.studentID,
      department: user.department,
      departmentName: getDepartmentName(user.department) || user.department
    };
    
    res.status(201).json({ 
      message: "User registered successfully",
      token, 
      user: userResponse 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try to find user by email first, then by studentID
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.findOne({ studentID: email });
    }
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });
    
    // Return user data excluding password
    // Include both department ID and name for frontend convenience
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentID: user.studentID,
      department: user.department,
      departmentName: getDepartmentName(user.department) || user.department
    };

    res.status(200).json({ token, user: userResponse });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
