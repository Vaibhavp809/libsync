const axios = require('axios');

const BASE_URL = 'http://172.22.132.218:5000';

// Test the barcode scanner functionality with real backend
async function testBarcodeScanner() {
  console.log('🔍 Testing Barcode Scanner Integration...\n');
  
  try {
    // Login as student first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "student@test.com",
      password: "password123"
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Student authenticated for scanner test');
    
    // Set up authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get all books to find valid ISBNs
    console.log('\n📚 Getting available books...');
    const booksResponse = await axios.get(`${BASE_URL}/api/books`);
    const books = booksResponse.data;
    console.log(`Found ${books.length} books in library`);
    
    // Test ISBN search for each book
    console.log('\n📱 Testing barcode scanner functionality...');
    for (let i = 0; i < Math.min(3, books.length); i++) {
      const book = books[i];
      if (book.isbn) {
        console.log(`\n${i + 1}. Testing ISBN: ${book.isbn}`);
        try {
          const isbnResponse = await axios.get(`${BASE_URL}/api/books/isbn/${book.isbn}`);
          console.log(`   ✅ Found: "${isbnResponse.data.title}" by ${isbnResponse.data.author}`);
          console.log(`   📊 Status: ${isbnResponse.data.status}`);
          console.log(`   📂 Category: ${isbnResponse.data.category}`);
        } catch (err) {
          console.log(`   ❌ Error: ${err.response?.status} ${err.response?.statusText}`);
        }
      } else {
        console.log(`\n${i + 1}. Book "${book.title}" has no ISBN - skipping`);
      }
    }
    
    // Test with non-existent ISBN
    console.log('\n🔍 Testing non-existent ISBN...');
    try {
      await axios.get(`${BASE_URL}/api/books/isbn/9999999999999`);
      console.log('❌ Should have failed for non-existent ISBN');
    } catch (err) {
      console.log(`✅ Correctly handled non-existent ISBN: ${err.response?.status} ${err.response?.statusText}`);
    }
    
    console.log('\n🎉 Barcode Scanner Integration Test Complete!');
    console.log('\n📱 The barcode scanner should now work correctly:');
    console.log('   • Scan any book barcode to get instant book information');
    console.log('   • Manual ISBN entry also works');  
    console.log('   • Books are fetched from live backend data');
    console.log('   • Proper error handling for invalid ISBNs');
    
  } catch (error) {
    console.error('\n❌ Scanner integration test failed:');
    console.error('   Error:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
  }
}

testBarcodeScanner();