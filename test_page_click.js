const axios = require('axios');

async function testPageClick() {
  try {
    // Login
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
    console.log('✅ Login successful!\n');

    // Get all pages
    console.log('📄 Fetching all pages...');
    const pagesResponse = await axios.get('http://localhost:3000/api/pages', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const pages = pagesResponse.data.data;
    console.log(`✅ Found ${pages.length} pages\n`);

    if (pages.length > 0) {
      const firstPage = pages[0];
      console.log(`📖 Clicking on first page: "${firstPage.title}" (ID: ${firstPage.id})`);

      // Get specific page (simulating click)
      const pageResponse = await axios.get(`http://localhost:3000/api/pages/${firstPage.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('✅ Page loaded successfully!');
      console.log('\nPage details:');
      console.log(JSON.stringify(pageResponse.data.data, null, 2));
    } else {
      console.log('⚠️  No pages found');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

testPageClick();
