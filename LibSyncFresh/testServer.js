// Server Connectivity Test Script for LibSync
const axios = require('axios');

async function testServerConnectivity() {
  console.log('🔍 Testing LibSync Server Connectivity...\n');

  const testIPs = [
    '127.0.0.1',
    'localhost',
    '10.0.2.2',
    '192.168.1.131'
  ];

  const port = '5000';

  for (const ip of testIPs) {
    const baseURL = `http://${ip}:${port}`;
    
    console.log(`Testing: ${baseURL}`);
    
    try {
      // Test health endpoint
      const healthURL = `${baseURL}/api/health`;
      console.log(`  → GET ${healthURL}`);
      
      const response = await axios.get(healthURL, { 
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`  ✅ SUCCESS: ${response.status} ${response.statusText}`);
      console.log(`  📝 Response:`, response.data);
      
      // Test books endpoint
      try {
        const booksURL = `${baseURL}/api/books`;
        console.log(`  → GET ${booksURL}`);
        
        const booksResponse = await axios.get(booksURL, { 
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`  ✅ BOOKS API: ${booksResponse.status} - Found ${Array.isArray(booksResponse.data) ? booksResponse.data.length : '?'} books`);
        
      } catch (booksError) {
        console.log(`  ❌ BOOKS API FAILED: ${booksError.message}`);
      }
      
      console.log(`\n🎉 WORKING SERVER FOUND: ${baseURL}`);
      console.log(`Use this URL for your mobile app configuration.\n`);
      
      return { success: true, baseURL, ip, port };
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ Connection refused - Server not running on ${ip}:${port}`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ENOENT') {
        console.log(`  ❌ Host not found - ${ip} is not accessible`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`  ❌ Connection timeout - ${ip}:${port} is not responding`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('❌ No working server found on any tested IP address.');
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. Make sure your Node.js + MongoDB backend is running');
  console.log('2. Check that the server is running on port 5000');
  console.log('3. Verify the server has a /api/health endpoint');
  console.log('4. Check firewall settings');
  console.log('5. If using emulator, ensure network access is configured');
  
  return { success: false };
}

// Run the test
testServerConnectivity()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Server connectivity test completed successfully!');
      console.log(`Recommended configuration: ${result.baseURL}`);
    } else {
      console.log('\n❌ Server connectivity test failed.');
      console.log('Please start your backend server and try again.');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test script failed:', error.message);
    process.exit(1);
  });