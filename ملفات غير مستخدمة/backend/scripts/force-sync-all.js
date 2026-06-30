/**
 * Force Sync All — bypasses bridge's persistent socket limitation
 * 
 * The ZKTeco device only returns UNREAD attendance logs on persistent TCP connections.
 * The bridge reuses a single socket, so it never gets historical/full data again.
 *
 * This script creates a FRESH connection, reads EVERYTHING, and processes it.
 * 
 * Usage: node scripts/force-sync-all.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const axios = require('axios');

const DEVICE_IP = process.env.ZK_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {
  console.error('node-zklib not installed');
  process.exit(1);
}

(async () => {
  console.log('Force-sync: connecting to device (fresh socket)...');

  // 1. Fresh connection to device
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  console.log('Connected to device.');

  // 2. Get ALL attendance records
  const attendanceResult = await device.getAttendances();
  const records = attendanceResult.data || [];
  console.log(`Total records on device: ${records.length}`);

  // 3. Get ALL users
  const usersResult = await device.getUsers();
  const deviceUsers = usersResult.data || [];
  console.log(`Total users on device: ${deviceUsers.length}`);

  await device.disconnect();
  console.log('Device disconnected.');

  if (records.length === 0) {
    console.log('No records to sync.');
    process.exit(0);
  }

  // 4. Build device user map
  const deviceUserMap = {};
  deviceUsers.forEach(u => {
    const key = String(u.userId || u.user_id || u.id || '');
    deviceUserMap[key] = u.name || 'N/A';
  });

  // 5. Connect to DB
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  const { Attendance } = require('../models/Attendance');
  const { User } = require('../models/User');

  // 6. Load all system users with zkUserId
  const systemUsers = await User.find({}, 'name email department zkUserId employeeId').lean();
  const userByZkId = {};
  systemUsers.forEach(u => {
    if (u.zkUserId) userByZkId[u.zkUserId] = u;
    if (u.employeeId) userByZkId[u.employeeId] = u;
  });
  console.log(`System users with zkUserId: ${Object.keys(userByZkId).length}`);

  // 7. Process records in chunks (same logic as controller)
  const CHUNK = 500;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let start = 0; start < records.length; start += CHUNK) {
    const chunk = records.slice(start, start + CHUNK);
    
    // Get date range for this chunk
    const dates = chunk.map(r => new Date(r.recordTime || r.timestamp || r.time)).filter(d => !isNaN(d.getTime()));
    const minDate = new Date(Math.min(...dates));
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(Math.max(...dates));
    maxDate.setHours(23, 59, 59, 999);

    // Load existing records for this date range
    const existingAll = await Attendance.find({
      date: { $gte: minDate, $lte: maxDate }
    }).lean();
    const existingMap = new Map();
    for (const e of existingAll) {
      const key = e.employee
        ? `emp_${e.employee}_${new Date(e.date).toISOString().split('T')[0]}`
        : `dev_${e.deviceUserId}_${new Date(e.date).toISOString().split('T')[0]}`;
      if (!existingMap.has(key)) existingMap.set(key, []);
      existingMap.get(key).push(e);
    }

    const processedKeys = new Set();
    const bulkOps = [];
    const updateOps = [];
    let chunkCreated = 0;
    let chunkUpdated = 0;
    let chunkSkipped = 0;

    for (const record of chunk) {
      const ts = new Date(record.recordTime || record.timestamp || record.time);
      if (isNaN(ts.getTime())) { chunkSkipped++; continue; }

      const rawZkId = String(record.deviceUserId || record.userId || record.user_id || record.uid || '');
      if (!rawZkId) { chunkSkipped++; continue; }

      const user = userByZkId[rawZkId] || null;
      const dateStr = ts.toISOString().split('T')[0];
      const dedupKey = user
        ? `emp_${user._id}_${dateStr}`
        : `dev_${rawZkId}_${dateStr}`;
      
      if (processedKeys.has(dedupKey)) { chunkSkipped++; continue; }
      processedKeys.add(dedupKey);

      const existingRecords = existingMap.get(dedupKey) || [];

      if (existingRecords.length === 0) {
        // Create new record
        const checkInTime = ts;
        const workStart = new Date(checkInTime);
        workStart.setHours(9, 0, 0, 0);
        const isLate = checkInTime > workStart;
        const diffMinutes = isLate ? (checkInTime - workStart) / (1000 * 60) : 0;
        const status = !isLate ? 'on_time' : (diffMinutes > 120 ? 'very_late' : 'late');
        const attStatus = isLate ? 'late' : 'present';

        const doc = {
          date: ts,
          expectedHours: 8,
          status: attStatus,
          checkIn: {
            time: ts,
            status: status,
            location: 'جهاز بصمة',
            notes: 'تزامن مباشر'
          },
          lateReason: isLate ? 'تسجيل متأخر عبر جهاز البصمة' : null
        };

        if (user) {
          doc.employee = user._id;
          doc.department = user.department || null;
        } else {
          doc.deviceUserId = rawZkId;
          doc.deviceUserName = deviceUserMap[rawZkId] || `مستخدم جهاز #${rawZkId}`;
        }

        bulkOps.push({ insertOne: { document: doc } });
        chunkCreated++;
      } else {
        const primary = existingRecords[0];
        if (!primary.checkIn || !primary.checkIn.time) {
          updateOps.push({
            updateOne: {
              filter: { _id: primary._id },
              update: { $set: {
                'checkIn.time': ts,
                'checkIn.location': 'جهاز بصمة',
                'checkIn.notes': 'تزامن مباشر'
              }}
            }
          });
          chunkUpdated++;
        } else if (!primary.checkOut || !primary.checkOut.time) {
          const checkInTime = new Date(primary.checkIn.time);
          if (Math.abs(ts - checkInTime) > 60000) {
            updateOps.push({
              updateOne: {
                filter: { _id: primary._id },
                update: { $set: {
                  'checkOut.time': ts,
                  'checkOut.location': 'جهاز بصمة',
                  'checkOut.notes': 'تزامن مباشر'
                }}
              }
            });
            chunkUpdated++;
          } else { chunkSkipped++; }
        } else { chunkSkipped++; }
      }
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }
    if (updateOps.length > 0) {
      await Attendance.bulkWrite(updateOps, { ordered: false });
    }

    totalCreated += chunkCreated;
    totalUpdated += chunkUpdated;
    totalSkipped += chunkSkipped;

    const pct = Math.round((start + chunk.length) / records.length * 100);
    console.log(`  Chunk ${Math.floor(start/CHUNK)+1}/${Math.ceil(records.length/CHUNK)} (${pct}%): +${chunkCreated} created, ${chunkUpdated} updated, ${chunkSkipped} skipped`);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  SYNC COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  Total records: ${records.length}`);
  console.log(`  Created      : ${totalCreated}`);
  console.log(`  Updated      : ${totalUpdated}`);
  console.log(`  Skipped      : ${totalSkipped}`);
  console.log('');

  await mongoose.disconnect();
})();
