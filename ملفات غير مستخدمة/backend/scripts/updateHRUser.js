const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connection string from backend .env
const MONGODB_URI = 'mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/';

async function updateHRUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Update hr_manager
    const result = await collection.updateOne(
      { username: 'hr_manager' },
      { $set: { role: 'manager', isActive: true } }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      console.log('❌ User not found, creating new HR manager...');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await collection.insertOne({
        username: 'hr_manager',
        email: 'hr@radio.com',
        password: hashedPassword,
        name: 'رئيس الموارد البشرية',
        role: 'manager',
        department: 'human resources',
        isActive: true,
        createdAt: new Date()
      });
      console.log('✅ Created new HR manager user');
    } else {
      console.log('✅ Updated hr_manager to manager role and activated');
    }

    // Verify
    const user = await collection.findOne({ username: 'hr_manager' });
    console.log('User data:', {
      username: user.username,
      role: user.role,
      department: user.department,
      isActive: user.isActive
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateHRUser();
