const mongoose = require('mongoose');
require('dotenv').config();

async function dropUniqueIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/libsync');
    console.log('Connected to MongoDB');

    const Attendance = require('../models/Attendance');
    
    // Get current indexes
    const indexes = await Attendance.collection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Drop the unique index if it exists
    try {
      await Attendance.collection.dropIndex('student_1_date_1');
      console.log('✅ Successfully dropped unique index: student_1_date_1');
    } catch (err) {
      if (err.code === 27 || err.message.includes('index not found')) {
        console.log('ℹ️  Unique index does not exist (already removed or never created)');
      } else {
        throw err;
      }
    }
    
    // Create non-unique index
    await Attendance.collection.createIndex({ student: 1, date: 1 }, { unique: false });
    console.log('✅ Created non-unique index: student_1_date_1');
    
    // Verify indexes
    const newIndexes = await Attendance.collection.getIndexes();
    console.log('\nUpdated indexes:', JSON.stringify(newIndexes, null, 2));
    
    await mongoose.connection.close();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

dropUniqueIndex();

