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

// Device stores time in LOCAL (Saudi UTC+3) using packed integer.
// parseTimeToDate creates Date as new Date(year, month, day, hour, minute, second)
// which is interpreted in LOCAL timezone.
// We need to normalize to UTC.
function parseZkDate(record) {
  const raw = record.recordTime;
  // raw is already a Date object from parseTimeToDate, in local timezone
  // Convert to UTC by subtracting timezone offset
  return new Date(raw.getTime() - raw.getTimezoneOffset() * 60000);
}

(async () => {
  console.log('=== Smart Sync for today ===');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');

  // 1. Delete OLD records for target IDs that might have wrong dates
  const deleteResult = await Attendance.deleteMany({
    deviceUserId: { $in: TARGET_IDS }
  });
  console.log(`Deleted ${deleteResult.deletedCount} old records`);

  // 2. Connect to device
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  console.log('Device connected');
  
  const usersResult = await device.getUsers();
  const deviceUsers = usersResult.data || [];
  const deviceUserMap = {};
  deviceUsers.forEach(u => {
    const key = String(u.userId || u.user_id || u.id || '');
    deviceUserMap[key] = u.name || 'N/A';
  });

  const attResult = await device.getAttendances();
  const records = attResult.data || [];
  await device.disconnect();
  console.log(`Total device records: ${records.length}`);

  // 3. Filter for TODAY in LOCAL timezone (Saudi UTC+3)
  const now = new Date();
  // Get today's start in local timezone = today 00:00:00 in any timezone
  const localTodayStart = new Date(now);
  localTodayStart.setHours(0, 0, 0, 0);
  
  // Get tomorrow's start in local timezone
  const localTomorrowStart = new Date(localTodayStart);
  localTomorrowStart.setDate(localTomorrowStart.getDate() + 1);
  
  console.log(`Local today: ${localTodayStart.toString()} -> ${localTomorrowStart.toString()}`);
  console.log(`UTC: ${localTodayStart.toISOString()} -> ${localTomorrowStart.toISOString()}`);

  // Convert device recordTime to local Date for comparison
  const targetRecords = records.filter(r => {
    const rawTs = r.recordTime;
    if (!rawTs) return false;
    
    const rawId = String(r.deviceUserId);
    if (!TARGET_IDS.includes(rawId)) return false;
    
    // parseTimeToDate returns Date in local timezone already
    return rawTs >= localTodayStart && rawTs < localTomorrowStart;
  });
  
  console.log(`\nTarget ID records for today: ${targetRecords.length}`);

  if (targetRecords.length === 0) {
    console.log('No records found. Checking all today records on device...');
    const allToday = records.filter(r => {
      const rawTs = r.recordTime;
      return rawTs && rawTs >= localTodayStart && rawTs < localTomorrowStart;
    });
    console.log(`All records today on device: ${allToday.length}`);
    allToday.forEach(r => {
      console.log(`  userId:${r.deviceUserId} time:${r.recordTime.toString()}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  }

  // 4. Load system users
  const systemUsers = await User.find({}, 'name email department zkUserId employeeId').lean();
  const userByZkId = {};
  systemUsers.forEach(u => {
    if (u.zkUserId) userByZkId[u.zkUserId] = u;
    if (u.employeeId) userByZkId[u.employeeId] = u;
  });
  console.log(`System users with zkUserId: ${Object.keys(userByZkId).length}`);

  // 5. Group records by user+date for dedup
  const groups = {};
  for (const record of targetRecords) {
    const rawId = String(record.deviceUserId);
    const ts = record.recordTime;
    const dateKey = ts.toISOString().split('T')[0];
    const groupKey = `${rawId}_${dateKey}`;
    if (!groups[groupKey]) {
      groups[groupKey] = { userId: rawId, timestamp: ts, records: [] };
    }
    groups[groupKey].records.push({ ts, raw: record });
  }

  console.log(`\nGroups (user+date): ${Object.keys(groups).length}`);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const [key, group] of Object.entries(groups)) {
    // Sort records by time
    group.records.sort((a, b) => a.ts - b.ts);
    
    const user = userByZkId[group.userId] || null;
    
    // Check if there's an existing record in MongoDB for this employee+date
    const dateStart = new Date(group.timestamp);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);
    
    let existingRecord = null;
    if (user) {
      existingRecord = await Attendance.findOne({
        employee: user._id,
        date: { $gte: dateStart, $lt: dateEnd }
      }).lean();
    } else {
      existingRecord = await Attendance.findOne({
        deviceUserId: group.userId,
        date: { $gte: dateStart, $lt: dateEnd }
      }).lean();
    }
    
    const checkInTime = group.records[0].ts;
    const checkOutTime = group.records.length > 1 ? group.records[group.records.length - 1].ts : null;
    
    const workStart = new Date(checkInTime);
    workStart.setHours(9, 0, 0, 0);
    const isLate = checkInTime > workStart;
    const diffMinutes = isLate ? (checkInTime - workStart) / (1000 * 60) : 0;
    const checkStatus = !isLate ? 'on_time' : (diffMinutes > 120 ? 'very_late' : 'late');
    const attStatus = isLate ? 'late' : 'present';
    
    if (existingRecord) {
      // Update existing record with check-in/check-out
      const updateData = {};
      if (!existingRecord.checkIn || !existingRecord.checkIn.time) {
        updateData['checkIn.time'] = checkInTime;
        updateData['checkIn.status'] = checkStatus;
        updateData['checkIn.location'] = 'جهاز بصمة';
        updateData['checkIn.notes'] = 'تزامن مباشر';
        updateData.status = attStatus;
      }
      if (checkOutTime && (!existingRecord.checkOut || !existingRecord.checkOut.time)) {
        const existingCheckIn = existingRecord.checkIn?.time 
          ? new Date(existingRecord.checkIn.time) : checkInTime;
        if (Math.abs(checkOutTime - existingCheckIn) > 60000) {
          updateData['checkOut.time'] = checkOutTime;
          updateData['checkOut.location'] = 'جهاز بصمة';
          updateData['checkOut.notes'] = 'تزامن مباشر';
          const duration = Math.round((checkOutTime - existingCheckIn) / (1000 * 60 * 60) * 100) / 100;
          updateData.duration = duration;
          updateData.overtime = duration > 8 ? duration - 8 : 0;
        }
      }
      if (Object.keys(updateData).length > 0) {
        await Attendance.updateOne({ _id: existingRecord._id }, { $set: updateData });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Create new record
      const doc = {
        date: checkInTime,
        expectedHours: 8,
        status: attStatus,
        checkIn: {
          time: checkInTime,
          status: checkStatus,
          location: 'جهاز بصمة',
          notes: 'تزامن مباشر'
        },
        lateReason: isLate ? 'تسجيل متأخر عبر جهاز البصمة' : null
      };
      
      if (checkOutTime) {
        const duration = checkOutTime 
          ? Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100
          : 0;
        doc.checkOut = {
          time: checkOutTime,
          location: 'جهاز بصمة',
          notes: 'تزامن مباشر'
        };
        doc.duration = duration;
        doc.overtime = duration > 8 ? duration - 8 : 0;
      }
      
      if (user) {
        doc.employee = user._id;
        doc.department = user.department || null;
      } else {
        doc.deviceUserId = group.userId;
        doc.deviceUserName = deviceUserMap[group.userId] || `مستخدم جهاز #${group.userId}`;
      }
      
      await Attendance.create(doc);
      created++;
    }
  }
  
  console.log(`\nResults: ${created} created, ${updated} updated, ${skipped} skipped`);
  
  // 6. Verify
  const verifyRecords = await Attendance.find({
    $or: [
      { date: { $gte: localTodayStart, $lt: localTomorrowStart } },
      { deviceUserId: { $in: TARGET_IDS } }
    ]
  }).sort({ 'checkIn.time': -1 }).populate('employee', 'name department').lean();
  
  console.log(`\nTotal records in DB (today or target IDs): ${verifyRecords.length}`);
  const seenIds = new Set();
  verifyRecords.forEach(r => {
    const id = r.deviceUserId || r.employee?.zkUserId || '-';
    if (!seenIds.has(id)) {
      seenIds.add(id);
      const name = r.employee?.name || r.deviceUserName || 'unmapped';
      const ci = r.checkIn?.time ? new Date(r.checkIn.time).toLocaleString('ar-SA') : '-';
      console.log(`  ${name.padEnd(20)} | ID:${id.padEnd(5)} | ${ci}`);
    }
  });
  
  // Show which IDs are still missing
  const foundIds = new Set(verifyRecords.map(r => r.deviceUserId).filter(Boolean));
  TARGET_IDS.forEach(id => {
    if (!foundIds.has(id) && !verifyRecords.some(r => r.employee?.zkUserId === id)) {
      console.log(`  ⚠️ MISSING: ID ${id}`);
    }
  });
  
  await mongoose.disconnect();
  console.log('\nDone!');
})();
