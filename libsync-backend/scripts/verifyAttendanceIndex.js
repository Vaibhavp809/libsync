const mongoose = require('mongoose');
require('dotenv').config();

async function verifyIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/libsync');
    console.log('✅ Connected to MongoDB\n');

    const Attendance = require('../models/Attendance');
    
    // Get current indexes
    const indexes = await Attendance.collection.getIndexes();
    console.log('Current indexes on Attendance collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Check if unique index exists
    const studentDateIndex = indexes['student_1_date_1'];
    if (studentDateIndex) {
      if (studentDateIndex.unique) {
        console.log('\n❌ PROBLEM: Unique index still exists! This will prevent multiple sessions per day.');
        console.log('   Run: node scripts/dropAttendanceUniqueIndex.js to fix this.');
      } else {
        console.log('\n✅ GOOD: Non-unique index exists. Multiple sessions per day are allowed.');
      }
    } else {
      console.log('\n⚠️  WARNING: student_1_date_1 index does not exist.');
      console.log('   It will be created automatically when the first attendance record is saved.');
      console.log('   The schema defines it as non-unique, so multiple sessions will work.');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyIndex();

