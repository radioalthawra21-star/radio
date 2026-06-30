require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');

async function detailedInspect() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_task_management');
  const users = await User.find({}).select('-password');

  console.log('Detailed role inspection (char codes):\n');
  console.log('username'.padEnd(15), 'role_raw'.padEnd(25), 'hex_codes');
  console.log('-'.repeat(80));

  for (const u of users) {
    const role = u.role || '';
    const hexCodes = [...role].map(ch => ch.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
    console.log(u.username.padEnd(15), JSON.stringify(role).padEnd(25), hexCodes);
  }

  await mongoose.disconnect();
}

detailedInspect().catch(e => { console.error(e); process.exit(1); });
