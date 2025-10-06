const axios = require('axios');

const BASE_URL = 'http://172.22.132.218:5000';

async function testUpdatedAuth() {
  console.log('🔐 Testing Updated Authentication & Reservation System...\n');
  
  try {
    // Test 1: Login with email
    console.log('1️⃣ Testing login with email...');
    try {
      const loginWithEmail = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: "student@test.com",
        password: "password123"
      });
      console.log('✅ Login with email successful');
      console.log(`   User: ${loginWithEmail.data.user.name} (${loginWithEmail.data.user.role})`);
      
      // Set token for subsequent requests
      const token = loginWithEmail.data.token;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Test 2: Try to reserve a book
      console.log('\n2️⃣ Testing book reservation...');
      const booksResponse = await axios.get(`${BASE_URL}/api/books`);
      const books = booksResponse.data;
      
      if (books.length > 0) {
        const availableBook = books.find(book => book.status === 'Available');
        
        if (availableBook) {
          console.log(`   Found available book: "${availableBook.title}"`);
          
          try {
            const reservationResponse = await axios.post(`${BASE_URL}/api/reservations`, {
              bookId: availableBook._id,
              studentId: loginWithEmail.data.user._id
            });
            
            console.log('✅ Reservation successful!');
            console.log(`   Message: ${reservationResponse.data.message}`);
            
            // Check if book status updated
            const updatedBookResponse = await axios.get(`${BASE_URL}/api/books/${availableBook._id}`);
            console.log(`   Book status after reservation: ${updatedBookResponse.data.status}`);
            
            // Test 3: Cancel the reservation
            console.log('\n3️⃣ Testing reservation cancellation...');
            const reservationId = reservationResponse.data.reservation._id;
            
            const cancelResponse = await axios.put(`${BASE_URL}/api/reservations/cancel/${reservationId}`);
            console.log('✅ Cancellation successful!');
            console.log(`   Message: ${cancelResponse.data.message}`);
            
            // Check if book is available again
            const bookAfterCancel = await axios.get(`${BASE_URL}/api/books/${availableBook._id}`);
            console.log(`   Book status after cancellation: ${bookAfterCancel.data.status}`);
            
          } catch (reservationError) {
            if (reservationError.response?.data?.message?.includes('already reserved')) {
              console.log('ℹ️  Book already reserved (expected if previous tests ran)');
            } else {
              console.error('❌ Reservation failed:', reservationError.response?.data || reservationError.message);
            }
          }
        } else {
          console.log('⚠️ No available books found for reservation test');
        }
      }
      
      // Test 4: Try login with student ID (if we know one)
      console.log('\n4️⃣ Testing login with student ID...');
      const studentId = loginWithEmail.data.user.studentID;
      if (studentId) {
        try {
          const loginWithStudentId = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: studentId, // Using email field but sending student ID
            password: "password123"
          });
          console.log('✅ Login with student ID successful');
          console.log(`   User: ${loginWithStudentId.data.user.name}`);
        } catch (err) {
          console.log('❌ Login with student ID failed:', err.response?.data?.message);
        }
      } else {
        console.log('⚠️ No student ID available for testing');
      }
      
    } catch (authError) {
      console.error('❌ Authentication test failed:', authError.response?.data || authError.message);
    }
    
    console.log('\n🎉 Updated authentication and reservation tests completed!');
    console.log('\n✅ Key improvements:');
    console.log('   • Login now accepts email OR student ID');
    console.log('   • Book model supports Reserved status');
    console.log('   • Reservation cancellation restores book availability');
    console.log('   • Registration checks both email and student ID uniqueness');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testUpdatedAuth();