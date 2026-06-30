/**
 * Raw Attendance Dump Script
 * ===========================
 * Extracts ALL attendance logs directly from the ZKTeco biometric device,
 * including orphaned/unmapped records, and cross-references with the database.
 *
 * Usage: node scripts/dump-raw-attendance.js [--date YYYY-MM-DD] [--export]
 *
 * --date    Filter records to a specific date (default: today)
 * --export  Export all unmatched/orphaned records to JSON files
 * --all     Show ALL records from device (ignores date filter)
 * --sample  Show the first N raw records with full detail to inspect field names
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Attendance } = require('../models/Attendance');
const { User } = require('../models/User');

let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {
  console.error('❌ node-zklib not installed. Run: npm install node-zklib');
  process.exit(1);
}

const DEVICE_IP = process.env.ZK_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');
const DEVICE_TIMEOUT = parseInt(process.env.ZK_TIMEOUT || '5000');

function parseArgs() {
  const args = process.argv.slice(2);
  let filterDate = null;
  let exportFiles = false;
  let showAll = false;
  let sampleCount = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      filterDate = args[i + 1];
      i++;
    } else if (args[i] === '--export') {
      exportFiles = true;
    } else if (args[i] === '--all') {
      showAll = true;
    } else if (args[i] === '--sample') {
      sampleCount = parseInt(args[i + 1]) || 5;
      i++;
    }
  }
  return { filterDate, exportFiles, showAll, sampleCount };
}

(async () => {
  const { filterDate, exportFiles, showAll, sampleCount } = parseArgs();
  const today = filterDate ? new Date(filterDate) : new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayStart = new Date(todayStr + 'T00:00:00.000Z');
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     RAW ATTENDANCE DUMP — ZKTeco Device Forensics      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Device IP     : ${DEVICE_IP}:${DEVICE_PORT}`);
  console.log(`Filter date   : ${showAll ? 'ALL RECORDS' : todayStr}`);
  console.log(`Export mode   : ${exportFiles ? 'YES' : 'NO'}`);
  console.log('');

  // ─── Step 1: Connect to device ───
  console.log('📡 Connecting to device...');
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, DEVICE_TIMEOUT, 5000);
  let deviceConnected = false;
  try {
    await device.createSocket();
    deviceConnected = true;
    console.log('✅ Device connected');
  } catch (err) {
    console.error('❌ Failed to connect to device:', err.message);
    process.exit(1);
  }

  // ─── Step 2: Get device info ───
  console.log('');
  console.log('─── Device Info ───');
  try {
    const info = await device.getInfo();
    const d = info.data || info;
    console.log(`  Device name     : ${d.deviceName || 'N/A'}`);
    console.log(`  Serial number   : ${d.serialNumber || d.sn || 'N/A'}`);
    console.log(`  Firmware version: ${d.firmwareVersion || d.version || 'N/A'}`);
    console.log(`  Device time     : ${d.deviceTime || new Date().toISOString()}`);
    console.log(`  User count      : ${d.userCount || d.usersCount || '?'}`);
    console.log(`  FP count        : ${d.fingerprintCount || d.fpCount || '?'}`);
    console.log(`  Face count      : ${d.faceCount || '?'}`);
    console.log(`  Admin count     : ${d.adminCount || '?'}`);
    console.log(`  Record count    : ${d.recordCount || d.attendanceCount || '?'}`);
  } catch (err) {
    console.warn('  ⚠️  Could not read full device info:', err.message);
  }

  // ─── Step 3: Fetch all users from device ───
  console.log('');
  console.log('─── Device Users ───');
  let deviceUsers = [];
  try {
    const result = await device.getUsers();
    deviceUsers = result.data || [];
    console.log(`  Total users on device: ${deviceUsers.length}`);
    if (deviceUsers.length > 0) {
      // Show a sample user's full structure
      console.log('');
      console.log('  Raw sample (first user object):');
      const keys = Object.keys(deviceUsers[0]);
      keys.forEach(k => {
        console.log(`    ${k}: ${JSON.stringify(deviceUsers[0][k])}`);
      });
      console.log('');
      console.log('  USER LIST:');
      console.log('  ' + '-'.repeat(80));
      console.log(`  ${'ID'.padEnd(8)} ${'Name'.padEnd(22)} ${'FP'.padEnd(4)} ${'UID'.padEnd(6)} ${'Role'.padEnd(6)}`);
      console.log('  ' + '-'.repeat(80));
      deviceUsers.forEach(u => {
        const uid = String(u.userId || u.user_id || u.id || '');
        const name = (u.name || 'N/A').substring(0, 20);
        const fp = String(u.fingerprintCount ?? u.fingerprints ?? u.fpCount ?? '0');
        const devUid = String(u.uid ?? '-');
        const role = String(u.role ?? u.admin ?? '-');
        console.log(`  ${uid.padEnd(8)} ${name.padEnd(22)} ${fp.padEnd(4)} ${devUid.padEnd(6)} ${role.padEnd(6)}`);
      });
    }
  } catch (err) {
    console.warn('  ⚠️  Could not fetch device users:', err.message);
  }

  // ─── Step 4: Fetch ALL raw attendance logs from device ───
  console.log('');
  console.log('─── Raw Attendance Logs (from device) ───');
  let rawRecords = [];
  try {
    const attendanceResult = await device.getAttendances();
    rawRecords = attendanceResult.data || [];
    console.log(`  Total raw logs on device: ${rawRecords.length}`);
  } catch (err) {
    console.error('❌ Failed to fetch attendance logs:', err.message);
    await device.disconnect();
    process.exit(1);
  }

  await device.disconnect();

  // ─── Step 4a: Show raw sample records with ALL fields ───
  if (sampleCount > 0 && rawRecords.length > 0) {
    console.log('');
    console.log(`─── RAW SAMPLE (first ${Math.min(sampleCount, rawRecords.length)} records) ───`);
    for (let i = 0; i < Math.min(sampleCount, rawRecords.length); i++) {
      const r = rawRecords[i];
      console.log(`  Record #${i}:`);
      console.log(`    ${JSON.stringify(r, null, 4).split('\n').map(l => '    ' + l).join('\n').trim()}`);
      console.log('');
    }
    // Also show last sampleCount records (might be today's)
    if (rawRecords.length > sampleCount) {
      console.log(`─── RAW SAMPLE (last ${Math.min(sampleCount, rawRecords.length)} records) ───`);
      for (let i = Math.max(0, rawRecords.length - sampleCount); i < rawRecords.length; i++) {
        const r = rawRecords[i];
        console.log(`  Record #${i}:`);
        console.log(`    ${JSON.stringify(r, null, 4).split('\n').map(l => '    ' + l).join('\n').trim()}`);
        console.log('');
      }
    }
  }

  // ─── Step 5: Map all raw records ───
  console.log('');
  console.log('─── Mapped Attendance Records ───');

  const deviceUserMap = {};
  deviceUsers.forEach(u => {
    const key = String(u.userId || u.user_id || u.id || '');
    deviceUserMap[key] = u;
  });

  const mapped = rawRecords.map((r, idx) => {
    const rawTs = r.timestamp || r.recordTime || r.time;
    const ts = rawTs instanceof Date ? rawTs : new Date(rawTs);
    const rawUserId = String(r.deviceUserId || r.userId || r.user_id || r.uid || '');
    const deviceUser = deviceUserMap[rawUserId] || null;
    return {
      rawIndex: idx,
      deviceUserId: rawUserId,
      deviceUserName: deviceUser ? (deviceUser.name || 'N/A') : 'NO_USER_ON_DEVICE',
      deviceFingerprintCount: deviceUser ? (deviceUser.fingerprintCount ?? deviceUser.fingerprints ?? '?') : '—',
      timestamp: isNaN(ts.getTime()) ? null : ts,
      timestampISO: isNaN(ts.getTime()) ? 'INVALID_TIMESTAMP' : ts.toISOString(),
      dateStr: isNaN(ts.getTime()) ? 'INVALID' : ts.toISOString().split('T')[0],
      timeStr: isNaN(ts.getTime()) ? 'INVALID' : ts.toISOString().split('T')[1].substring(0, 8),
      verifyMode: r.verifyMode ?? r.verify_mode ?? '?',
      status: r.status ?? '?',
      recordId: r.id ?? r.recordId ?? null,
      raw: r
    };
  });

  // ─── Step 6: Filter by date ───
  let filtered = mapped;
  if (!showAll) {
    filtered = mapped.filter(r => r.timestamp && r.dateStr === todayStr);
  }

  const deviceDateRecords = mapped.filter(r => r.timestamp);
  const uniqueDeviceDates = [...new Set(deviceDateRecords.map(r => r.dateStr))].sort();
  console.log(`  Date range in device: ${uniqueDeviceDates[0] || 'N/A'} → ${uniqueDeviceDates[uniqueDeviceDates.length - 1] || 'N/A'}`);
  console.log(`  Unique dates on device: ${uniqueDeviceDates.length}`);
  console.log(`  Records matching filter (${showAll ? 'ALL' : todayStr}): ${filtered.length}`);

  if (uniqueDeviceDates.length <= 30) {
    uniqueDeviceDates.forEach(d => {
      const count = deviceDateRecords.filter(r => r.dateStr === d).count;
      const marker = d === todayStr ? ' ⬅ TODAY' : '';
      console.log(`    ${d}: ${count} records${marker}`);
    });
  }

  // ─── Step 7: Connect to MongoDB ───
  console.log('');
  console.log('─── Database Cross-Reference ───');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  const dbName = mongoose.connection.db.databaseName;
  console.log(`  MongoDB database: ${dbName}`);

  const allDbUsers = await User.find({}, 'name email username department zkUserId role').lean();
  const dbUserByZkId = {};
  allDbUsers.forEach(u => {
    if (u.zkUserId) dbUserByZkId[u.zkUserId] = u;
  });
  console.log(`  System users with zkUserId: ${Object.keys(dbUserByZkId).length} / ${allDbUsers.length}`);

  // ─── Count device-user-ids in raw records ───
  const uniqueRawUserIds = [...new Set(mapped.filter(r => r.deviceUserId && r.deviceUserId !== '').map(r => r.deviceUserId))].sort();
  const noIdRecords = filtered.filter(r => !r.deviceUserId || r.deviceUserId === '');
  console.log(`  Unique user IDs in device logs: ${uniqueRawUserIds.length}`);
  console.log(`  Records with NO user ID: ${noIdRecords.length}`);
  console.log('');

  // ─── Step 8: Classify every record ───
  console.log('─── CLASSIFIED MOVEMENT LOG ───');
  console.log('');

  const orphaned = [];
  const mappedRecords = [];

  if (filtered.length === 0) {
    console.log('  ⚠️  NO RECORDS FOUND for the specified date.');
    console.log('  Possible causes:');
    console.log('    • Device clock is wrong (check "Device time" above)');
    console.log('    • No one checked in on this date');
    console.log('    • Records were already cleared from device memory');
    console.log(`    • Expected date "${todayStr}" does not match any device log dates`);
    console.log('');
    console.log('  📌 Device log date range spans these dates:');
    uniqueDeviceDates.forEach(d => {
      const count = deviceDateRecords.filter(r => r.dateStr === d).count;
      console.log(`     ${d}: ${count} records`);
    });
    console.log('');
    console.log('  💡 Suggestion: Re-run with --all to see every record on the device');
    console.log('     node scripts/dump-raw-attendance.js --all');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`  Found ${filtered.length} record(s) for ${showAll ? 'ALL DATES' : todayStr}`);
  console.log('');

  const todayDbRecords = await Attendance.find({
    $or: [
      { date: { $gte: todayStart, $lt: todayEnd } },
      { 'checkIn.time': { $gte: todayStart, $lt: todayEnd } },
      { 'checkOut.time': { $gte: todayStart, $lt: todayEnd } },
      { createdAt: { $gte: todayStart, $lt: todayEnd } }
    ]
  }).populate('employee', 'name email zkUserId').lean();

  console.log(`  DB records for today: ${todayDbRecords.length}`);
  console.log('');

  const dbByDeviceId = {};
  todayDbRecords.forEach(r => {
    if (r.deviceUserId) dbByDeviceId[r.deviceUserId] = r;
  });

  // ─── Print the granular movement table ───
  const HEADER = `  ${'#'.padEnd(5)} ${'DeviceID'.padEnd(10)} ${'DeviceUser'.padEnd(22)} ${'Date'.padEnd(12)} ${'Time'.padEnd(10)} ${'Type'.padEnd(10)} ${'DB Match'.padEnd(22)} ${'Status'.padEnd(14)}`;
  console.log('  ' + '='.repeat(105));
  console.log(HEADER);
  console.log('  ' + '='.repeat(105));

  const grouped = {};
  filtered.forEach(r => {
    if (!r.timestamp) return;
    const key = r.deviceUserId || 'NO_ID';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  let idx = 0;
  for (const [userId, records] of Object.entries(grouped)) {
    records.sort((a, b) => a.timestamp - b.timestamp);

    const dbUser = dbUserByZkId[userId];
    const dbRec = dbByDeviceId[userId];

    for (const r of records) {
      idx++;
      let movementType = '?';
      let dbStatus = '❌ NOT IN DB';
      let dbMatch = '—';

      if (dbUser) {
        dbMatch = `✓ ${dbUser.name} (${dbUser.department || '-'})`;

        if (dbRec) {
          const ci = dbRec.checkIn?.time ? new Date(dbRec.checkIn.time).getTime() : null;
          const co = dbRec.checkOut?.time ? new Date(dbRec.checkOut.time).getTime() : null;
          const rt = r.timestamp.getTime();

          if (ci && Math.abs(rt - ci) < 60000) {
            movementType = 'CHECK-IN';
            dbStatus = '✅ IN DB';
          } else if (co && Math.abs(rt - co) < 60000) {
            movementType = 'CHECK-OUT';
            dbStatus = '✅ IN DB';
          } else if (ci && !co) {
            movementType = 'EXTRA';
            dbStatus = '⚠️ EXTRA SCAN';
          } else {
            movementType = '?';
            dbStatus = '⚠️ NO MATCH';
          }
        } else {
          movementType = 'ORPHANED';
          dbStatus = '⚠️ MAPPED/NO DB REC';
        }
      } else {
        dbMatch = '—';
        movementType = 'UNMAPPED';
        dbStatus = '❌ ORPHANED';
      }

      const deviceName = (r.deviceUserName || 'N/A').substring(0, 20);
      console.log(
        `  ${String(idx).padEnd(5)} ` +
        `${userId.padEnd(10)} ` +
        `${deviceName.padEnd(22)} ` +
        `${r.dateStr.padEnd(12)} ` +
        `${r.timeStr.padEnd(10)} ` +
        `${movementType.padEnd(10)} ` +
        `${dbMatch.padEnd(22)} ` +
        `${dbStatus.padEnd(14)}`
      );

      if (movementType === 'UNMAPPED' || movementType === 'ORPHANED') {
        orphaned.push(r);
      } else {
        mappedRecords.push(r);
      }
    }
    console.log('');
  }

  console.log('  ' + '-'.repeat(105));
  console.log('');

  // ─── Summary statistics ───
  console.log('─── SUMMARY ───');
  console.log('');
  console.log(`  Total records from device : ${filtered.length}`);
  console.log(`  ✅ Mapped/Matched         : ${mappedRecords.length}`);
  console.log(`  ⚠️  Unmapped/Orphaned     : ${orphaned.length}`);
  console.log(`  📊 DB records today       : ${todayDbRecords.length}`);
  console.log(`  👤 Device users           : ${deviceUsers.length}`);
  console.log(`  👤 System users with ZKID : ${Object.keys(dbUserByZkId).length}`);
  console.log('');

  if (orphaned.length > 0) {
    console.log('─── ORPHANED/UNMAPPED RECORDS DETAIL ───');
    console.log('');
    const orphanUserIds = [...new Set(orphaned.map(r => r.deviceUserId))];
    console.log(`  ${orphanUserIds.length} device user(s) have no matching system user:`);
    orphanUserIds.forEach(uid => {
      const recs = orphaned.filter(r => r.deviceUserId === uid);
      const deviceUser = deviceUserMap[uid];
      const name = deviceUser ? (deviceUser.name || 'UNNAMED') : (uid === 'NO_ID' ? 'NO USER ID IN LOG' : 'NOT ON DEVICE');
      const times = recs.map(r => r.timeStr).join(', ');
      console.log(`    Device ID "${uid.padEnd(10)}" → "${name}"`);
      console.log(`    ${recs.length} record(s) at: ${times}`);
      console.log('');
    });
    console.log('  💡 To map these users, go to:');
    console.log('     http://localhost:5173/biometric → تبويب "ربط المستخدمين"');
    console.log('');
  }

  if (exportFiles) {
    const fs = require('fs');
    const outDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const allExport = {
      generatedAt: new Date().toISOString(),
      device: { ip: DEVICE_IP, port: DEVICE_PORT },
      filter: showAll ? 'ALL' : todayStr,
      totalDeviceLogs: rawRecords.length,
      totalFiltered: filtered.length,
      orphanedCount: orphaned.length,
      mappedCount: mappedRecords.length,
      orphanedRecords: orphaned.map(r => ({
        deviceUserId: r.deviceUserId,
        deviceUserName: r.deviceUserName,
        timestamp: r.timestampISO,
        date: r.dateStr,
        time: r.timeStr,
        verifyMode: r.verifyMode,
        recordId: r.recordId
      })),
      allRecords: filtered.map(r => ({
        deviceUserId: r.deviceUserId,
        deviceUserName: r.deviceUserName,
        timestamp: r.timestampISO,
        date: r.dateStr,
        time: r.timeStr,
        verifyMode: r.verifyMode,
        recordId: r.recordId
      }))
    };

    const filePath = path.join(outDir, `raw-attendance-dump-${showAll ? 'all' : todayStr}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allExport, null, 2), 'utf8');
    console.log(`  📄 Full export written to: ${filePath}`);
  }

  // ─── Recommendations ───
  console.log('');
  console.log('─── RECOMMENDATIONS ───');
  console.log('');

  if (noIdRecords.length > 0) {
    console.log('  ⚠️  CRITICAL: Records with NO user ID detected!');
    console.log(`     ${noIdRecords.length} attendance logs have an empty/missing userId field.`);
    console.log('     This means the device stores attendance without linking to a user.');
    console.log('     Possible causes:');
    console.log('     1. Users scanned but were not properly enrolled (deleted from device)');
    console.log('     2. The device\'s attendance log format stores userId differently');
    console.log('     3. Corrupted records on the device');
    console.log('');
    console.log('  📌 Run with --sample 10 to see raw record structure:');
    console.log('     node scripts/dump-raw-attendance.js --sample 10');
    console.log('');
  }

  if (orphaned.length > 0) {
    console.log(`  ⚠️  ${orphaned.length} record(s) are orphaned (no matching system user).`);
    console.log('     Map them via the Biometric page → "ربط المستخدمين" tab.');
  }
  if (mappedRecords.length > 0) {
    console.log(`  ✅ ${mappedRecords.length} record(s) have matching system users.`);
  }
  console.log('');
  console.log('  To see orphaned/unmapped records only, pipe the output:');
  console.log('     node scripts/dump-raw-attendance.js --date YYYY-MM-DD | findstr ORPHANED');
  console.log('');
  console.log('  To export as JSON:');
  console.log('     node scripts/dump-raw-attendance.js --date YYYY-MM-DD --export');

  await mongoose.disconnect();
  console.log('');
  console.log('Done.');
})();
