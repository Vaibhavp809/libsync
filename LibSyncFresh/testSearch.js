const axios = require('axios');

const BASE_URL = 'http://172.22.132.218:5000';

async function testSearch() {
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "student@test.com",
      password: "password123"
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Student logged in successfully');
    
    // Test search
    console.log('Testing search with query="test"...');
    const searchResponse = await axios.get(`${BASE_URL}/api/books/search?query=test`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Search successful: ${searchResponse.data.length} results`);
    
  } catch (error) {
    console.error('❌ Search failed:', error.response?.data || error.message);
  }
}

testSearch();