import axios from 'axios';

// Test login with admin account
async function testLogin() {
  try {
    console.log('Testing login with admin account...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/login', {
      email: 'm.manohar2003@gmail.com',
      password: '@Manohar596'
    });
    
    console.log('Login successful!');
    console.log('User data:', loginResponse.data);
    
    // Store cookies for further requests if needed
    const cookies = loginResponse.headers['set-cookie'];
    return cookies;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Main function to run the tests
async function main() {
  await testLogin();
}

main().catch(console.error);