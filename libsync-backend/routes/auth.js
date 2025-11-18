const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { register, login } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

// NEW: Search students by email for autocomplete
router.get("/students", verifyToken, async (req, res) => {
  try {
    const User = require("../models/User");
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: "Email parameter is required" });
    }

    const students = await User.find({
      email: { $regex: email, $options: 'i' },
      role: 'student'
    }).select('name email studentID department').limit(10);

    res.json(students);
  } catch (err) {
    console.error("Error searching students:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
