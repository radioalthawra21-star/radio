const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// List of target user IDs
const TARGET_IDS = [
  "1001","1002","1003","1004","1005","1006","1007","1008","1009",
  "1010","1011","1012","1014","1015","1016","1017","1018","1019",
  "1020","1029","1031","1036","1046","1052"
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log('DB name:', db.databaseName);
  
  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');
  
  // Check all records in Attendance collection
  const total = await Attendance.countDocuments();
  console.log('Total Attendance records:', total);
  
  // Check today's records with different date ranges
  const now = new Date();
  console.log('Server time:', now.toISOString());
  console.log('Server timezone offset:', now.getTimezoneOffset());
  
  // Local today (Saudi = UTC+3)
  const localTodayStart = new Date(now);
  localTodayStart.setHours(0, 0, 0, 0);
  const localTodayEnd = new Date(localTodayStart);
  localTodayEnd.setDate(localTodayEnd.getDate() + 1);
  
  console.log('\nLocal today range:');
  console.log('  Start:', localTodayStart.toISOString());
  console.log('  End:', localTodayEnd.toISOString());
  
  const localCount = await Attendance.countDocuments({
    date: { $gte: localTodayStart, $lt: localTodayEnd }
  });
  console.log('  Count:', localCount);
  
  // Check all records the script created (with deviceUserId in TARGET_IDS)
  const targetRecords = await Attendance.find({
    deviceUserId: { $in: TARGET_IDS }
  }).sort({ date: -1 }).limit(50).lean();
  
  console.log(`\nRecords with deviceUserId in target (${targetRecords.length}):`);
  targetRecords.forEach(r => {
    console.log(`  deviceUserId: ${r.deviceUserId}, date: ${r.date}, checkIn: ${r.checkIn?.time}, employee: ${r.employee || 'unmapped'}, status: ${r.status}`);
  });
  
  // Check records created today
  const todayRecords = await Attendance.find({
    createdAt: { $gte: new Date(Date.now() - 3600000) } // last hour
  }).sort({ createdAt: -1 }).limit(50).lean();
  
  console.log(`\nRecords created in last hour (${todayRecords.length}):`);
  todayRecords.forEach(r => {
    console.log(`  _id: ${r._id}, deviceUserId: ${r.deviceUserId}, date: ${r.date}, checkIn: ${r.checkIn?.time}, employee: ${r.employee || 'unmapped'}`);
  });
  
  // Check which TARGET_IDS have zkUserId in User collection
  const users = await User.find({ zkUserId: { $in: TARGET_IDS } }).lean();
  console.log(`\nSystem users with zkUserId in target (${users.length}):`);
  users.forEach(u => console.log(`  ${u.name} - zkUserId: ${u.zkUserId}, department: ${u.department}`));
  
  await mongoose.disconnect();
})();
