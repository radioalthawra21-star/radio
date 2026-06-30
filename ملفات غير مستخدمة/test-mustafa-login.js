const axios = require('axios');

const testLogin = async () => {
  try {
    // Try common passwords for Mustafa
    const passwordsToTry = ['admin123', 'mostafa123', '123456', 'password'];
    
    for (const password of passwordsToTry) {
      try {
        console.log(`\nTrying password: ${password}`);
        const response = await axios.post('http://localhost:3000/api/auth/login', {
          username: 'mostafa',
          password: password
        }, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        });

        if (response.data.success) {
          console.log('✅ Login successful!');
          console.log('User:', JSON.stringify(response.data.data?.user, null, 2));
          
          // Test fetching departments
          const token = response.data.data.token;
          const deptResponse = await axios.get('http://localhost:3000/api/departments', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          console.log('\nDepartments response:');
          console.log('Status:', deptResponse.status);
          console.log('Data:', JSON.stringify(deptResponse.data, null, 2));
          return;
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          console.log(`❌ Failed with password: ${password}`);
        } else {
          console.log(`❌ Error: ${err.message}`);
        }
      }
    }
    
    console.log('\n❌ All password attempts failed');
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testLogin();