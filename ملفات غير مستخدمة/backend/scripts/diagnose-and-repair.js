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

const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
const DAYS_BACK = (() => {
  const idx = args.indexOf('--days');
  return idx >= 0 && args[idx + 1] ? parseInt(args[idx + 1]) : 7;
})();

(async () => {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  ZKTeco Attendance Diagnose & Repair Tool');
  console.log('══════════════════════════════════════════════');
  console.log('');
  if (FIX_MODE) console.log('  🔧 MODE: FIX — will update incorrect records');
  else console.log('  🔍 MODE: DIAGNOSE — read-only, no changes');
  console.log(`  📅 Checking last ${DAYS_BACK} days`);
  console.log('');

  const cutOff = new Date();
  cutOff.setDate(cutOff.getDate() - DAYS_BACK);
  cutOff.setHours(0, 0, 0, 0);

  await mongoose.connect(process.env.MONGODB_URI);
  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');

  // 1. Load mapped users
  const systemUsers = await User.find({ zkUserId: { $in: TARGET_IDS } }, 'name email department zkUserId').lean();
  const userMap = {};
  systemUsers.forEach(u => { userMap[u.zkUserId] = u; });
  console.log(`  System users mapped: ${systemUsers.length}`);

  // 2. Connect to device
  console.log('  Connecting to device...');
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  console.log('  ✅ Device connected');

  const allRecords = (await device.getAttendances()).data || [];
  await device.disconnect();
  console.log(`  Total device records: ${allRecords.length}`);

  // 3. Filter & group device records by (user, local date) for recent days
  const deviceGroups = {};
  for (const r of allRecords) {
    const rawId = String(r.deviceUserId || '');
    if (!TARGET_IDS.includes(rawId)) continue;
    const ts = r.recordTime;
    if (!ts) continue;

    const d = new Date(ts);
    if (d < cutOff) continue; // skip old records

    const localDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const key = `${rawId}_${localDateStr}`;
    if (!deviceGroups[key]) deviceGroups[key] = { userId: rawId, dateStr: localDateStr, timestamps: [] };
    deviceGroups[key].timestamps.push(d);
  }

  // Sort each group's timestamps
  for (const g of Object.values(deviceGroups)) {
    g.timestamps.sort((a, b) => a - b);
    g.firstTime = g.timestamps[0];
    g.lastTime = g.timestamps.length > 1 ? g.timestamps[g.timestamps.length - 1] : null;
  }

  console.log(`  Device groups (user+date) in last ${DAYS_BACK} days: ${Object.keys(deviceGroups).length}`);

  // 4. Load existing Attendance records for these users & dates
  const allUserIds = systemUsers.map(u => u._id);
  const dbRecords = await Attendance.find({
    employee: { $in: allUserIds },
    date: { $gte: cutOff }
  }).populate('employee', 'name zkUserId').lean();
  const dbMap = {};
  for (const r of dbRecords) {
    if (!r.employee) continue;
    const d = new Date(r.date);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const key = `${r.employee.zkUserId || ''}_${ds}`;
    dbMap[key] = r;
  }
  console.log(`  DB Attendance records in range: ${dbRecords.length}`);

  // 5. Compare device vs DB for each group
  console.log('');
  console.log('  RESULTS');
  console.log('  ' + '='.repeat(120));
  console.log(`  ${'User'.padEnd(22)} ${'Date'.padEnd(12)} ${'Device Records'.padEnd(22)} ${'DB CheckIn'.padEnd(14)} ${'DB CheckOut'.padEnd(14)} ${'Correct CI'.padEnd(14)} ${'Correct CO'.padEnd(14)} ${'Status'.padEnd(14)}`);
  console.log('  ' + '='.repeat(120));

  let okCount = 0;
  let fixCount = 0;
  let issueCount = 0;
  const fixOps = [];

  const sortedGroups = Object.values(deviceGroups).sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.userId.localeCompare(b.userId));

  for (const g of sortedGroups) {
    const user = userMap[g.userId];
    if (!user) continue;
    const dbKey = `${g.userId}_${g.dateStr}`;
    const dbRec = dbMap[dbKey];
    const userName = user.name || 'N/A';

    const devCheckIn = g.firstTime;
    const devCheckOut = g.lastTime;
    const hasBoth = g.timestamps.length >= 2;

    let dbCheckIn = null;
    let dbCheckOut = null;
    let status = '✅ OK';

    if (dbRec) {
      dbCheckIn = dbRec.checkIn?.time || null;
      dbCheckOut = dbRec.checkOut?.time || null;

      const ciMatch = dbCheckIn && Math.abs(new Date(dbCheckIn) - devCheckIn) < 60000;
      const coMatch = hasBoth && devCheckOut && dbCheckOut && Math.abs(new Date(dbCheckOut) - devCheckOut) < 60000;
      const coMissing = hasBoth && !dbCheckOut;
      const coWrong = hasBoth && dbCheckOut && !coMatch;

      if (!ciMatch) {
        status = '❌ WRONG CHECKIN';
        issueCount++;
      } else if (coMissing) {
        status = '❌ MISSING CHECKOUT';
        issueCount++;
      } else if (coWrong) {
        status = '❌ WRONG CHECKOUT';
        issueCount++;
      } else {
        okCount++;
      }
    } else {
      status = '❌ MISSING RECORD';
      issueCount++;
    }

    const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
    const fmtDev = (dt) => dt ? dt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

    console.log(
      `  ${userName.padEnd(22)} ` +
      `${g.dateStr.padEnd(12)} ` +
      `${`${fmtDev(devCheckIn)} → ${fmtDev(devCheckOut)}`.padEnd(22)} ` +
      `${fmt(dbCheckIn).padEnd(14)} ` +
      `${fmt(dbCheckOut).padEnd(14)} ` +
      `${fmtDev(devCheckIn).padEnd(14)} ` +
      `${fmtDev(devCheckOut || null).padEnd(14)} ` +
      `${status.padEnd(14)}`
    );

    if (FIX_MODE && status.startsWith('❌')) {
      if (dbRec) {
        checkInFix = dbCheckIn && Math.abs(new Date(dbCheckIn) - devCheckIn) < 60000 ? 'same' : devCheckIn;
        const updateData = {};
        if (checkInFix !== 'same') {
          updateData['checkIn.time'] = devCheckIn;
          updateData['checkIn.location'] = 'جهاز بصمة';
          updateData['checkIn.notes'] = 'تم الإصلاح';
          const workStart = new Date(devCheckIn); workStart.setHours(9, 0, 0, 0);
          const checkStatus = devCheckIn <= workStart ? 'on_time' : ((devCheckIn - workStart) / 60000 > 120 ? 'very_late' : 'late');
          updateData['checkIn.status'] = checkStatus;
          updateData.status = checkStatus === 'on_time' ? 'present' : 'late';
        }
        if (hasBoth && devCheckOut && (!dbCheckOut || Math.abs(new Date(dbCheckOut) - devCheckOut) >= 60000)) {
          updateData['checkOut.time'] = devCheckOut;
          updateData['checkOut.location'] = 'جهاز بصمة';
          updateData['checkOut.notes'] = 'تم الإصلاح';
          const refTime = checkInFix !== 'same' ? devCheckIn : new Date(dbCheckIn);
          const duration = Math.round((devCheckOut - refTime) / (1000 * 60 * 60) * 100) / 100;
          updateData.duration = duration;
          updateData.overtime = duration > 8 ? duration - 8 : 0;
        }
        if (Object.keys(updateData).length > 0) {
          fixOps.push({ updateOne: { filter: { _id: dbRec._id }, update: { $set: updateData } } });
          fixCount++;
        }
      } else {
        // CREATE new Attendance record for MISSING RECORD
        const dateObj = new Date(g.dateStr + 'T00:00:00.000Z');
        const newRec = {
          employee: user._id,
          deviceUserId: g.userId,
          date: dateObj,
          checkIn: {
            time: devCheckIn,
            status: 'on_time',
            location: 'جهاز بصمة'
          },
          status: 'present'
        };
        if (hasBoth && devCheckOut) {
          newRec.checkOut = {
            time: devCheckOut,
            location: 'جهاز بصمة'
          };
          newRec.duration = Math.round((devCheckOut - devCheckIn) / (1000 * 60 * 60) * 100) / 100;
          newRec.overtime = newRec.duration > 8 ? newRec.duration - 8 : 0;
        }
        fixOps.push({ insertOne: { document: newRec } });
        fixCount++;
      }
    }
  }

  console.log('  ' + '-'.repeat(120));
  console.log(`  ✅ OK: ${okCount}  |  ❌ Issues: ${issueCount}  |  ${FIX_MODE ? `🔧 Fixed: ${fixCount}` : '🔍 Read-only'}`);

  if (FIX_MODE && fixOps.length > 0) {
    console.log('');
    console.log('  Applying fixes...');
    await Attendance.bulkWrite(fixOps, { ordered: false });
    console.log(`  ✅ ${fixCount} records updated!`);
  }

  if (!FIX_MODE && issueCount > 0) {
    console.log('');
    console.log('  ─── HOW TO FIX ───');
    console.log('  Run with --fix flag to correct all issues:');
    console.log('    node scripts/diagnose-and-repair.js --fix');
    console.log('');
    console.log('  To see ALL users (not just today):');
    console.log('    node scripts/diagnose-and-repair.js --all');
  }

  await mongoose.disconnect();
  console.log('');
  console.log('Done.');
})();
