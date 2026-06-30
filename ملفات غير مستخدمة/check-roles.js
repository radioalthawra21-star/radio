require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  const users = await User.find({}).select('-password');

  console.log('Summary of role issues:');

  const expected = new Set(['admin', 'manager', 'employee']);
  const issues = [];

  for (const u of users) {
    const role = u.role;
    if (!role) {
      issues.push(`${u.username}: role is null/undefined`);
    } else if (typeof role !== 'string') {
      issues.push(`${u.username}: role type is ${typeof role}`);
    } else if (!expected.has(role)) {
      issues.push(`${u.username}: unexpected role value ${JSON.stringify(role)}`);
    } else if (role !== role.trim()) {
      issues.push(`${u.username}: role has whitespace: ${JSON.stringify(role)}`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ No role issues found.');
  } else {
    console.log('❌ Issues found:');
    issues.forEach(i => console.log('  - ' + i));
  }

  const admin = users.find(u => u.username === 'admin');
  if (admin) {
    console.log('\nAdmin user details:');
    console.log('  _id:', admin._id.toString());
    console.log('  role:', JSON.stringify(admin.role));
    console.log('  isActive:', admin.isActive);
    console.log('  lastLogin:', admin.lastLogin);
  } else {
    console.log('Admin user not found!');
  }

  await mongoose.disconnect();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
