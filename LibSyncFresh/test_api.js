// Test script to verify the mobile app can connect to the optimized backend
import { apiService } from './services/apiService.js';

async function testAPI() {
  try {
    console.log('🧪 Testing Mobile App API Connection...');
    
    // Test 1: Get paginated books
    console.log('\n📚 Test 1: Fetching paginated books...');
    const books = await apiService.getBooks({ page: 1, limit: 5 });
    console.log('✅ Success! Received:', books);
    
    // Test 2: Get statistics
    console.log('\n📊 Test 2: Fetching statistics...');
    const stats = await apiService.getBookStatistics();
    console.log('✅ Success! Statistics:', stats);
    
    // Test 3: Search books
    console.log('\n🔍 Test 3: Searching books...');
    const searchResults = await apiService.searchBooks('computer');
    console.log('✅ Success! Search results:', searchResults?.length || 0, 'books found');
    
    console.log('\n🎉 All tests passed! Mobile app can connect to optimized backend.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testAPI();