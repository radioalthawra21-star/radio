const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET_IDS = [
  "1001","1002","1003","1004","1005","1006","1007","1008","1009",
  "1010","1011","1012","1014","1015","1016","1017","1018","1019",
  "1020","1029","1031","1036","1046","1052"
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');

  // === Query 1: Records with deviceUserId in target IDs (limit to 100) ===
  console.log('=== Records in DB for target IDs (last 100) ===');
  const records = await Attendance.find(
    { deviceUserId: { $in: TARGET_IDS } },
    { deviceUserId: 1, date: 1, checkIn: 1, employee: 1, status: 1 }
  ).sort({ date: -1 }).limit(100).maxTimeMS(10000).lean();
  
  console.log(`Count: ${records.length}`);
  
  const byDeviceId = {};
  records.forEach(r => {
    const id = r.deviceUserId;
    if (!byDeviceId[id]) byDeviceId[id] = [];
    byDeviceId[id].push(r);
  });
  
  for (const [id, recs] of Object.entries(byDeviceId)) {
    const dates = recs.map(r => new Date(r.date).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort();
    console.log(`  ID ${id}: ${recs.length} records, dates: ${uniqueDates.join(', ')}`);
  }
  
  // === Query 2: Today's records using local timezone ===
  console.log('\n=== Today records (local time) ===');
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  console.log(`Range: ${todayStart.toISOString()} -> ${todayEnd.toISOString()}`);
  
  const todayRecords = await Attendance.find(
    { date: { $gte: todayStart, $lt: todayEnd } },
    { deviceUserId: 1, date: 1, checkIn: 1, employee: 1, deviceUserName: 1, status: 1 }
  ).sort({ 'checkIn.time': -1 }).maxTimeMS(10000).populate('employee', 'name').lean();
  
  console.log(`Count: ${todayRecords.length}`);
  todayRecords.forEach(r => {
    const name = r.employee?.name || r.deviceUserName || 'unmapped';
    const d = new Date(r.date).toISOString();
    const ci = r.checkIn?.time ? new Date(r.checkIn.time).toISOString() : '-';
    console.log(`  ${name.padEnd(20)} | devId:${r.deviceUserId || '-'.padEnd(3)} | date:${d} | checkIn:${ci}`);
  });
  
  // === Query 3: Which target IDs are missing from today ===
  const todayDevIds = new Set(todayRecords.filter(r => r.deviceUserId).map(r => r.deviceUserId));
  const missing = TARGET_IDS.filter(id => !todayDevIds.has(id));
  
  if (missing.length > 0) {
    console.log(`\n=== Missing target IDs from today (${missing.length}) ===`);
    console.log(missing.join(', '));
    
    // Check what dates they DO have records
    console.log('\nAlternative dates for missing IDs:');
    for (const id of missing) {
      const idRecords = records.filter(r => r.deviceUserId === id);
      if (idRecords.length > 0) {
        const dates = idRecords.map(r => new Date(r.date).toISOString().split('T')[0]);
        console.log(`  ID ${id}: found on ${[...new Set(dates)].join(', ')}`);
      } else {
        console.log(`  ID ${id}: NO records in DB at all`);
      }
    }
  } else {
    console.log('\nAll target IDs have records in today!');
  }
  
  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
