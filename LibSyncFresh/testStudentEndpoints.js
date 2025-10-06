const axios = require('axios');

const BASE_URL = 'http://172.22.132.218:5000';

// Test student user data
const testStudent = {
  name: "Test Student",
  email: "student@test.com",
  password: "password123",
  role: "student",
  studentID: "STU001",
  department: "Computer Science"
};

let studentToken = '';
let studentId = '';

console.log('🧪 Testing Student API Endpoints...\n');

// Function to register and login a test student
async function createTestStudent() {
  try {
    console.log('Creating test student...');
    
    // Try to register the student
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testStudent);
      console.log('✅ Student registered successfully');
      studentToken = registerResponse.data.token;
      studentId = registerResponse.data.user._id;
      console.log(`   Token: ${studentToken.substring(0, 20)}...`);
      console.log(`   Student ID: ${studentId}`);
    } catch (regError) {
      if (regError.response && regError.response.status === 400 && regError.response.data.message === 'User already exists') {
        console.log('📝 Student already exists, attempting login...');
        
        // Login with existing student
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: testStudent.email,
          password: testStudent.password
        });
        
        console.log('✅ Student logged in successfully');
        studentToken = loginResponse.data.token;
        studentId = loginResponse.data.user._id;
        console.log(`   Token: ${studentToken.substring(0, 20)}...`);
        console.log(`   Student ID: ${studentId}`);
      } else {
        throw regError;
      }
    }
  } catch (error) {
    console.error('❌ Failed to create/login student:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Function to test an endpoint
async function testEndpoint(method, endpoint, data = null, description) {
  try {
    console.log(`Testing: ${description}`);
    console.log(`  ${method.toUpperCase()} ${endpoint}`);
    
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`  ✅ ${response.status} ${response.statusText}`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`  📊 Returned ${response.data.length} items`);
    } else if (response.data) {
      console.log(`  📝 Response: ${JSON.stringify(response.data).substring(0, 100)}${JSON.stringify(response.data).length > 100 ? '...' : ''}`);
    }
    
    console.log('');
    return response.data;
  } catch (error) {
    const status = error.response?.status || 'No Response';
    const message = error.response?.data || error.message;
    console.log(`  ❌ ${status} ${typeof message === 'string' ? message : JSON.stringify(message)}`);
    console.log('');
    return null;
  }
}

async function runTests() {
  await createTestStudent();
  
  console.log('\n🔍 Testing Student API Endpoints:\n');
  
  // Test Books endpoints
  console.log('📚 BOOKS ENDPOINTS:');
  await testEndpoint('GET', '/api/books', null, 'Get all books');
  await testEndpoint('GET', '/api/books/search?query=test', null, 'Search books');
  
  // Test Reservations endpoints
  console.log('📋 RESERVATIONS ENDPOINTS:');
  await testEndpoint('GET', `/api/reservations/student/${studentId}`, null, 'Get student reservations by ID');
  await testEndpoint('GET', '/api/reservations/my-reservations', null, 'Get my reservations');
  
  // Test Loans endpoints  
  console.log('📖 LOANS ENDPOINTS:');
  await testEndpoint('GET', `/api/loans/student/${studentId}`, null, 'Get student loans by ID');
  await testEndpoint('GET', '/api/loans/my-loans', null, 'Get my loans');
  
  // Test making a reservation (need a book ID first)
  console.log('🔄 FUNCTIONAL TESTS:');
  const books = await testEndpoint('GET', '/api/books', null, 'Get books for reservation test');
  
  if (books && books.length > 0) {
    const availableBook = books.find(book => book.status === 'Available' || book.available);
    if (availableBook) {
      console.log(`📌 Attempting to reserve book: ${availableBook.title}`);
      await testEndpoint('POST', '/api/reservations', {
        bookId: availableBook._id,
        studentId: studentId
      }, 'Make a reservation');
      
      // Check reservations again
      await testEndpoint('GET', '/api/reservations/my-reservations', null, 'Check reservations after booking');
    } else {
      console.log('  ⚠️ No available books found for reservation test');
    }
  }
  
  console.log('🎉 Student endpoint testing completed!');
}

// Run the tests
runTests().catch(console.error);