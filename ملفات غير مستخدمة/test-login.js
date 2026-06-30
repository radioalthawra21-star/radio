/**
 * Manual API test from Node.js
 */

const axios = require('axios');

const testLogin = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });

    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    console.log('User:', response.data.data?.user?.username);
    console.log('Token exists:', !!response.data.data?.token);

  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
  }
};

testLogin();
