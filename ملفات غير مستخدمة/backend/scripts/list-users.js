const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ZKLib = require('node-zklib');

const DEVICE_IP = process.env.ZK_IP || '192.168.15.50';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { User } = require('../models/User');
  
  const systemUsers = await User.find({}, 'name email department zkUserId username role isActive').lean();
  console.log('\n=== System Users ===');
  systemUsers.forEach(u => {
    console.log(`  ${u.name.padEnd(20)} | ${(u.email||'').padEnd(25)} | dep:${(u.department||'-').padEnd(15)} | zkID:${(u.zkUserId||'-').padEnd(5)} | ${u.isActive ? 'active' : 'inactive'}`);
  });
  
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  const usersResult = await device.getUsers();
  const deviceUsers = usersResult.data || [];
  await device.disconnect();
  
  console.log('\n=== Device Users ===');
  deviceUsers.forEach(u => {
    const id = String(u.userId || u.user_id || u.id || '');
    const name = u.name || 'N/A';
    console.log(`  ID:${id.padEnd(5)} | ${name}`);
  });
  
  await mongoose.disconnect();
})();
