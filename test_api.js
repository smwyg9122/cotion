const axios = require('axios');

async function testAPI() {
  try {
    // First, login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'ayuta1',
      password: 'password'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const accessToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful!');
    console.log('Access Token:', accessToken.substring(0, 20) + '...');

    // Then, fetch pages
    console.log('\n📄 Fetching pages...');
    const pagesResponse = await axios.get('http://localhost:3000/api/pages', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ Pages fetched successfully!');
    console.log('\nPages data:');
    console.log(JSON.stringify(pagesResponse.data, null, 2));
    console.log(`\nTotal root pages: ${pagesResponse.data.data.length}`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAPI();
