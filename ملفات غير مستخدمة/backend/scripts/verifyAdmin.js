/**
 * Verify admin password hash
 */

require('dotenv').config();
const path = require('path');
const connectDB = require(path.join(__dirname, '..', 'config', 'db'));
const { User } = require(path.join(__dirname, '..', 'models', 'User'));
const bcrypt = require('bcryptjs');

const verifyAdmin = async () => {
  try {
    await connectDB();

    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      console.log('Admin not found');
      return;
    }

    console.log('Admin username:', admin.username);
    console.log('Admin isActive:', admin.isActive);
    console.log('Password hash length:', admin.password.length);
    console.log('Password hash preview:', admin.password.substring(0, 30) + '...');

    // Test if admin123 matches
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log(`Does "${testPassword}" match?`, isMatch);

    // Also try with admin (old default)
    const isMatch2 = await bcrypt.compare('admin', admin.password);
    console.log(`Does "admin" match?`, isMatch2);

    // Show full hash for debugging
    console.log('\nFull password hash:', admin.password);

  } catch (error) {
    console.error('Error:', error.message);
  }
};

verifyAdmin();
