const axios = require('axios');

const BASE_URL = 'http://172.22.132.218:5000';

// Test the actual API calls that the React Native app would make
async function testAppIntegration() {
  console.log('🧪 Testing React Native App Integration...\n');
  
  try {
    // Step 1: Login as student (simulating what authService.login does)
    console.log('1️⃣  Testing student login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "student@test.com",
      password: "password123"
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log(`   User: ${user.name} (${user.role})`);
    console.log(`   Student ID: ${user._id}`);
    
    // Set up axios defaults (simulating what authService does)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n2️⃣  Testing book list (BookListScreen)...');
    const booksResponse = await axios.get(`${BASE_URL}/api/books`);
    console.log(`✅ Books loaded: ${booksResponse.data.length} books`);
    
    console.log('\n3️⃣  Testing book search (BookListScreen search)...');
    const searchResponse = await axios.get(`${BASE_URL}/api/books/search?query=atomic`);
    console.log(`✅ Search results: ${searchResponse.data.length} books`);
    
    console.log('\n4️⃣  Testing reservations list (MyReservationsScreen)...');
    const reservationsResponse = await axios.get(`${BASE_URL}/api/reservations/my-reservations`);
    console.log(`✅ Reservations loaded: ${reservationsResponse.data.length} reservations`);
    
    console.log('\n5️⃣  Testing loan history (LoanHistoryScreen)...');
    const loansResponse = await axios.get(`${BASE_URL}/api/loans/my-loans`);
    console.log(`✅ Loans loaded: ${loansResponse.data.length} loans`);
    
    // Test making a reservation if there are available books
    if (booksResponse.data.length > 0) {
      const availableBook = booksResponse.data.find(book => 
        book.status === 'Available' || book.available === true
      );
      
      if (availableBook) {
        console.log('\n6️⃣  Testing book reservation (BookListScreen reserve)...');
        try {
          const reserveResponse = await axios.post(`${BASE_URL}/api/reservations`, {
            studentId: user._id,
            bookId: availableBook._id
          });
          console.log('✅ Reservation successful');
          console.log(`   Reserved: "${availableBook.title}"`);
        } catch (err) {
          if (err.response?.data?.message?.includes('already reserved')) {
            console.log('ℹ️  Book already reserved (expected)');
          } else {
            throw err;
          }
        }
      } else {
        console.log('\n6️⃣  ⚠️ No available books for reservation test');
      }
    }
    
    console.log('\n🎉 All React Native app integration tests passed!');
    console.log('\n📱 The mobile app should now work correctly with:');
    console.log('   • Student authentication');
    console.log('   • Book browsing and search');
    console.log('   • Making reservations');
    console.log('   • Viewing reservation history');
    console.log('   • Viewing loan history');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:');
    console.error('   Error:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
  }
}

testAppIntegration();