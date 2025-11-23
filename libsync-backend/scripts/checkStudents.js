const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for student check");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Check existing students
const checkStudents = async () => {
  try {
    console.log('Checking existing students in database...\n');
    
    // Get all users
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Get only students
    const students = await User.find({ role: 'student' });
    console.log(`Total students: ${students.length}\n`);
    
    if (students.length > 0) {
      console.log('📚 Existing Students:');
      console.log('==================');
      students.forEach((student, index) => {
        console.log(`${index + 1}. Name: ${student.name || 'N/A'}`);
        console.log(`   Email: ${student.email || 'N/A'}`);
        console.log(`   Student ID: ${student.studentID || 'N/A'}`);
        console.log(`   Department: ${student.department || 'N/A'}`);
        console.log(`   Role: ${student.role}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No students found in database!');
      console.log('\nTo create a test student, you can use the admin panel or run:');
      console.log('POST /api/users with data:');
      console.log(`{
  "name": "Test Student",
  "email": "test@example.com",
  "studentID": "2MM22CS001",
  "department": "Computer Science",
  "role": "student",
  "password": "password123"
}`);
    }
    
    // Also check if there are any users with similar studentID patterns
    const usersWithStudentID = await User.find({ studentID: { $exists: true, $ne: null } });
    console.log(`\nUsers with studentID field: ${usersWithStudentID.length}`);
    
  } catch (error) {
    console.error('Error checking students:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkStudents();
};

main();