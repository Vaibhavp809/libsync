// Backend Endpoint Discovery Script
const axios = require('axios');

async function testBackendEndpoints() {
  console.log('🔍 Testing Backend API Endpoints...\n');

  const baseURL = 'http://172.22.132.218:5000';
  
  // Sample JWT token from your logs
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Y2U2ZTIyOGJjMWQzNzdjNjQzMWY2ZSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzU4NDUxNDYxLCJleHAiOjE3NTg1Mzc4NjF9.rrGFzQ2rlOCqTAafQHdF46-GfB3htSq9K6uYx3l89z0';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpointsToTest = [
    // Books endpoints
    '/api/books',
    '/api/book',
    '/books',
    '/book',
    '/api/library/books',
    
    // Reservations endpoints  
    '/api/reservations',
    '/api/reservation',
    '/reservations',
    '/reservation',
    '/api/reservations/student/68ce6e228bc1d377c6431f6e',
    '/api/reservation/student/68ce6e228bc1d377c6431f6e',
    
    // Loans endpoints
    '/api/loans',
    '/api/loan', 
    '/loans',
    '/loan',
    '/api/loans/student/68ce6e228bc1d377c6431f6e',
    '/api/loan/student/68ce6e228bc1d377c6431f6e',
    
    // Alternative patterns
    '/api/student/reservations/68ce6e228bc1d377c6431f6e',
    '/api/student/loans/68ce6e228bc1d377c6431f6e',
    '/api/users/68ce6e228bc1d377c6431f6e/reservations',
    '/api/users/68ce6e228bc1d377c6431f6e/loans'
  ];

  const workingEndpoints = [];

  for (const endpoint of endpointsToTest) {
    const fullURL = `${baseURL}${endpoint}`;
    
    try {
      console.log(`Testing: ${fullURL}`);
      
      const response = await axios.get(fullURL, { 
        headers,
        timeout: 5000
      });
      
      console.log(`  ✅ SUCCESS: ${response.status} ${response.statusText}`);
      console.log(`  📊 Data Type: ${Array.isArray(response.data) ? `Array[${response.data.length}]` : typeof response.data}`);
      
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          console.log(`  📝 Sample: ${response.data.length > 0 ? JSON.stringify(response.data[0], null, 2).substring(0, 200) + '...' : 'Empty array'}`);
        } else {
          console.log(`  📝 Sample: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        }
      }
      
      workingEndpoints.push({
        endpoint,
        fullURL,
        status: response.status,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        count: Array.isArray(response.data) ? response.data.length : null
      });
      
      console.log('');
      
    } catch (error) {
      if (error.response) {
        console.log(`  ❌ ${error.response.status} ${error.response.statusText}`);
        if (error.response.status === 404) {
          console.log(`  💡 Endpoint does not exist`);
        } else if (error.response.status === 403) {
          console.log(`  💡 Access denied - check permissions`);
        } else if (error.response.status === 401) {
          console.log(`  💡 Unauthorized - token issue`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ Connection refused`);
      } else {
        console.log(`  ❌ ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('\n🎉 WORKING ENDPOINTS SUMMARY:');
  console.log('=====================================');
  
  if (workingEndpoints.length === 0) {
    console.log('❌ No working endpoints found');
    console.log('\n💡 Recommendations:');
    console.log('1. Check your backend routes configuration');
    console.log('2. Verify authentication middleware is properly set up');
    console.log('3. Check if endpoints use different naming conventions');
    console.log('4. Look at your backend route definitions');
  } else {
    workingEndpoints.forEach(ep => {
      console.log(`✅ ${ep.endpoint} → ${ep.status} (${ep.dataType}${ep.count !== null ? `, count: ${ep.count}` : ''})`);
    });
    
    console.log('\n📋 UPDATE YOUR APP WITH THESE WORKING ENDPOINTS:');
    workingEndpoints.forEach(ep => {
      if (ep.endpoint.includes('book')) {
        console.log(`📚 Books API: ${ep.endpoint}`);
      } else if (ep.endpoint.includes('reservation')) {
        console.log(`📌 Reservations API: ${ep.endpoint}`);
      } else if (ep.endpoint.includes('loan')) {
        console.log(`🔁 Loans API: ${ep.endpoint}`);
      }
    });
  }
}

// Run the test
testBackendEndpoints()
  .then(() => {
    console.log('\n✅ Endpoint discovery completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });