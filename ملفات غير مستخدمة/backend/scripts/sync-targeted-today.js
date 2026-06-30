const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const ZKLib = require('node-zklib');

const DEVICE_IP = process.env.ZK_IP || '192.168.15.50';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');

const TARGET_IDS = [
  "1001","1002","1003","1004","1005","1006","1007","1008","1009",
  "1010","1011","1012","1014","1015","1016","1017","1018","1019",
  "1020","1029","1031","1036","1046","1052"
];

(async () => {
  console.log('=== Targeted sync: today\'s records for specific user IDs ===');
  console.log(`Device: ${DEVICE_IP}:${DEVICE_PORT}`);
  console.log(`Target IDs: ${TARGET_IDS.join(', ')}`);
  console.log('');

  // 1. Connect to device
  console.log('Connecting to device...');
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  console.log('Connected.');

  // 2. Get users from device
  const usersResult = await device.getUsers();
  const deviceUsers = usersResult.data || [];
  const deviceUserMap = {};
  deviceUsers.forEach(u => {
    const key = String(u.userId || u.user_id || u.id || '');
    deviceUserMap[key] = u.name || 'N/A';
  });
  console.log(`Device users: ${deviceUsers.length}`);

  // 3. Get all attendance records
  const attendanceResult = await device.getAttendances();
  const allRecords = attendanceResult.data || [];
  console.log(`Total device records: ${allRecords.length}`);
  
  await device.disconnect();
  console.log('Device disconnected.\n');

  // 4. Filter for today + target IDs
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const filteredRecords = allRecords.filter(r => {
    const ts = new Date(r.timestamp || r.recordTime || r.time);
    if (isNaN(ts.getTime())) return false;
    const dateStr = ts.toISOString().split('T')[0];
    if (dateStr !== todayStr) return false;
    
    const rawZkId = String(r.deviceUserId || r.userId || r.user_id || r.uid || '');
    return TARGET_IDS.includes(rawZkId);
  });
  
  console.log(`Records for today (${todayStr}) matching target IDs: ${filteredRecords.length}`);
  
  if (filteredRecords.length === 0) {
    const allToday = allRecords.filter(r => {
      const ts = new Date(r.timestamp || r.recordTime || r.time);
      return !isNaN(ts.getTime()) && ts.toISOString().split('T')[0] === todayStr;
    });
    console.log(`All records from device today: ${allToday.length}`);
    if (allToday.length > 0) {
      console.log('Today\'s records have different user IDs than target:');
      const todayIds = new Set(allToday.map(r => String(r.deviceUserId || r.userId || r.user_id || r.uid || '')));
      console.log(`  Device IDs today: ${[...todayIds].join(', ')}`);
    } else {
      console.log('No records at all from today on the device.');
      // Check what dates exist
      const dates = new Set();
      allRecords.forEach(r => {
        const ts = new Date(r.timestamp || r.recordTime || r.time);
        if (!isNaN(ts.getTime())) dates.add(ts.toISOString().split('T')[0]);
      });
      console.log(`Device has records for these dates: ${[...dates].sort().join(', ')}`);
    }
    process.exit(0);
  }

  // 5. Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  console.log('MongoDB connected.\n');

  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');

  // 6. Load system users
  const systemUsers = await User.find({}, 'name email department zkUserId employeeId').lean();
  const userByZkId = {};
  systemUsers.forEach(u => {
    if (u.zkUserId) userByZkId[u.zkUserId] = u;
    if (u.employeeId) userByZkId[u.employeeId] = u;
  });
  console.log(`System users with zkUserId: ${Object.keys(userByZkId).length}`);

  // 7. Find existing attendance for today
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');
  const todayEnd = new Date(todayStr + 'T23:59:59.999Z');
  const existingAll = await Attendance.find({
    date: { $gte: todayStart, $lte: todayEnd }
  }).lean();
  const existingMap = new Map();
  for (const e of existingAll) {
    const key = e.employee
      ? `emp_${e.employee}`
      : `dev_${e.deviceUserId}`;
    if (!existingMap.has(key)) existingMap.set(key, []);
    existingMap.get(key).push(e);
  }
  console.log(`Existing attendance records today in DB: ${existingAll.length}\n`);

  // 8. Group records by user and sort chronologically
  const groups = {};
  for (const record of filteredRecords) {
    const ts = new Date(record.timestamp || record.recordTime || record.time);
    if (isNaN(ts.getTime())) continue;
    const rawZkId = String(record.deviceUserId || record.userId || record.user_id || record.uid || '');
    if (!rawZkId) continue;
    if (!groups[rawZkId]) groups[rawZkId] = { timestamps: [], deviceUserMapName: deviceUserMap[rawZkId] };
    groups[rawZkId].timestamps.push(ts);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const bulkOps = [];
  const updateOps = [];

  for (const [rawZkId, group] of Object.entries(groups)) {
    group.timestamps.sort((a, b) => a - b);
    const checkInTime = group.timestamps[0];
    const checkOutTime = group.timestamps.length > 1
      ? group.timestamps[group.timestamps.length - 1]
      : null;

    const user = userByZkId[rawZkId] || null;
    const dedupKey = user ? `emp_${user._id}` : `dev_${rawZkId}`;
    const existingRecords = existingMap.get(dedupKey) || [];
    
    const workStart = new Date(checkInTime);
    workStart.setHours(9, 0, 0, 0);
    const isLate = checkInTime > workStart;
    const diffMinutes = isLate ? (checkInTime - workStart) / (1000 * 60) : 0;
    const checkStatus = !isLate ? 'on_time' : (diffMinutes > 120 ? 'very_late' : 'late');
    const attStatus = isLate ? 'late' : 'present';

    if (existingRecords.length === 0) {
      const doc = {
        date: checkInTime,
        expectedHours: 8,
        status: attStatus,
        checkIn: { time: checkInTime, status: checkStatus, location: 'جهاز بصمة', notes: 'تزامن مباشر' },
        lateReason: isLate ? 'تسجيل متأخر عبر جهاز البصمة' : null
      };
      if (checkOutTime) {
        const duration = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
        doc.checkOut = { time: checkOutTime, location: 'جهاز بصمة', notes: 'تزامن مباشر' };
        doc.duration = duration;
        doc.overtime = duration > 8 ? duration - 8 : 0;
      }
      if (user) {
        doc.employee = user._id;
        doc.department = user.department || null;
      } else {
        doc.deviceUserId = rawZkId;
        doc.deviceUserName = group.deviceUserMapName || `مستخدم جهاز #${rawZkId}`;
      }
      bulkOps.push({ insertOne: { document: doc } });
      created++;
    } else {
      const primary = existingRecords[0];
      const updateData = {};
      if (!primary.checkIn || !primary.checkIn.time) {
        updateData['checkIn.time'] = checkInTime;
        updateData['checkIn.status'] = checkStatus;
        updateData['checkIn.location'] = 'جهاز بصمة';
        updateData['checkIn.notes'] = 'تزامن مباشر';
        updateData.status = attStatus;
      }
      if (checkOutTime && (!primary.checkOut || !primary.checkOut.time)) {
        const refCheckIn = primary.checkIn?.time ? new Date(primary.checkIn.time) : checkInTime;
        if (Math.abs(checkOutTime - refCheckIn) > 60000) {
          const duration = Math.round((checkOutTime - refCheckIn) / (1000 * 60 * 60) * 100) / 100;
          updateData['checkOut.time'] = checkOutTime;
          updateData['checkOut.location'] = 'جهاز بصمة';
          updateData['checkOut.notes'] = 'تزامن مباشر';
          updateData.duration = duration;
          updateData.overtime = duration > 8 ? duration - 8 : 0;
        }
      }
      if (Object.keys(updateData).length > 0) {
        updateOps.push({ updateOne: { filter: { _id: primary._id }, update: { $set: updateData } } });
        updated++;
      } else {
        skipped++;
      }
    }
  }

  // 9. Execute
  if (bulkOps.length > 0) {
    await Attendance.bulkWrite(bulkOps, { ordered: false });
    console.log(`Created: ${created} new records`);
  }
  if (updateOps.length > 0) {
    await Attendance.bulkWrite(updateOps, { ordered: false });
    console.log(`Updated: ${updated} existing records`);
  }
  console.log(`Skipped: ${skipped}`);
  
  console.log('\n=== Sync complete ===');
  
  // 10. Show what we just added
  const updatedToday = await Attendance.find({
    date: { $gte: todayStart, $lte: todayEnd }
  }).sort({ 'checkIn.time': -1 }).populate('employee', 'name department').lean();
  
  console.log(`\nTotal records in DB for today: ${updatedToday.length}`);
  console.log('\nRecords:');
  updatedToday.forEach(r => {
    const name = r.employee?.name || r.deviceUserName || 'غير معروف';
    const dept = r.employee?.department || r.department || '-';
    const time = r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString('ar-SA') : '--:--';
    const devId = r.deviceUserId || r.employee?.zkUserId || '-';
    console.log(`  ${name.padEnd(22)} | ${dept.padEnd(15)} | ${time} | معرف: ${devId} | ${r.status}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
})();
