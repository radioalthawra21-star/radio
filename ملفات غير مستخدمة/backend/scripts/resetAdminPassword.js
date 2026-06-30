/**
 * Reset admin password script
 */

require('dotenv').config();
const path = require('path');
const connectDB = require(path.join(__dirname, '..', 'config', 'db'));
const { User } = require(path.join(__dirname, '..', 'models', 'User'));

const resetAdminPassword = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    // Set plain password - Mongoose pre-save hook will hash it
    const newPassword = process.env.ADMIN_PASSWORD || 'admin123';
    admin.password = newPassword;
    admin.isActive = true;
    await admin.save();

    console.log('✅ Admin password reset successfully');
    console.log(`Username: ${admin.username}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Email: ${admin.email}`);

    // Verify the password works
    const isMatch = await admin.comparePassword(newPassword);
    console.log(`Password verification: ${isMatch ? '✅ WORKS' : '❌ FAILED'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdminPassword();
