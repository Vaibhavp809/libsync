const axios = require('axios');

const testStudentAPI = async () => {
  try {
    console.log('Testing Student Lookup API...\n');
    
    // Test with existing USN
    const existingUSN = '2MM22CS002'; // Abhishek Patil
    console.log(`Testing with existing USN: ${existingUSN}`);
    
    const response = await axios.get(`http://localhost:5000/api/users/student/${existingUSN}`);
    
    console.log('✅ API Response Success!');
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
  
  try {
    console.log('\n--- Testing with non-existent USN ---');
    const nonExistentUSN = '2MM22CS001';
    console.log(`Testing with non-existent USN: ${nonExistentUSN}`);
    
    const response = await axios.get(`http://localhost:5000/api/users/student/${nonExistentUSN}`);
    console.log('Unexpected success:', response.data);
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('✅ Expected 404 response for non-existent student');
      console.log('Message:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
};

testStudentAPI();