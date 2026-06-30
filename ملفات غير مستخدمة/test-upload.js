/**
 * Test upload endpoint
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const testUpload = async () => {
  try {
    // First get a token by logging in
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data.token;
    console.log('Got token:', token.substring(0, 20) + '...');

    // Find an image to upload
    const imagePath = path.join(__dirname, 'uploads', '1776762302655-31288143.png');
    const imageBuffer = fs.readFileSync(imagePath);

    // Create FormData manually
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('profileImage', imageBuffer, {
      filename: 'test-upload.png',
      contentType: 'image/png'
    });

    console.log('Uploading file...');

    const uploadRes = await axios.put(
      'http://localhost:3000/api/auth/profile-image',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Upload status:', uploadRes.status);
    console.log('Upload success:', uploadRes.data.success);
    console.log('Upload message:', uploadRes.data.message);
    console.log('User profile image:', uploadRes.data.data?.user?.profileImage);

  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
  }
};

testUpload();
