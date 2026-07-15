const { Attendance, AttendanceStatus, CheckInStatus } = require('../models/Attendance');
const { User } = require('../models/User');
const BiometricErrorLog = require('../models/BiometricErrorLog');
const DeviceLog = require('../models/DeviceLog');
const zktecoService = require('../services/zktecoService');
const { processStopByFingerprint } = require('./leaveController');

const BRIDGE_KEY = process.env.BRIDGE_SECRET_KEY;
if (!BRIDGE_KEY && process.env.NODE_ENV === 'production') {
  console.error('FATAL: BRIDGE_SECRET_KEY must be set in production');
  process.exit(1);
}
const BRIDGE_SECRET = BRIDGE_KEY || 'dev-bridge-key';
if (!BRIDGE_KEY) {
  console.warn('⚠️ BRIDGE_SECRET_KEY not set, using fallback for development only');
}

function verifyBridge(req, res, next) {
  const key = req.headers['x-bridge-key'];
  if (!key || key !== BRIDGE_SECRET) {
    return res.status(401).json({ success: false, message: 'مفتاح bridge غير صحيح' });
  }
  next();
}

function getDayRange(date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

async function findUserByZkId(zkUserId) {
  if (!zkUserId) return null;
  return User.findOne({
    $or: [
      { zkUserId: String(zkUserId) },
      { employeeId: String(zkUserId) }
    ]
  });
}

function determineCheckInStatus(timestamp) {
  const d = new Date(timestamp);
  const checkInMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const WORK_START_MIN = 6 * 60; // 06:00 UTC = 09:00 Saudi
  const diffMinutes = checkInMin - WORK_START_MIN;
  if (diffMinutes <= 10) {
    return CheckInStatus.ON_TIME;
  }
  if (diffMinutes > 120) {
    return CheckInStatus.VERY_LATE;
  }
  return CheckInStatus.LATE;
}

function calcDurationOvertime(checkInTime, checkOutTime) {
  const duration = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
  // Saudi work hours: 9:00-16:00 = 6:00-13:00 UTC
  const workStartMin = 6 * 60;
  const workEndMin = 13 * 60;
  const checkInMin = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes();
  const checkOutMin = checkOutTime.getUTCHours() * 60 + checkOutTime.getUTCMinutes();
  const overtimeAfter = Math.max(0, checkOutMin - workEndMin);
  const overtimeBefore = Math.max(0, workStartMin - checkInMin);
  const overtime = Math.round((overtimeAfter + overtimeBefore) / 60 * 100) / 100;
  return { duration, overtime };
}

async function receiveAttendance(req, res) {
  try {
    const { records, source } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد سجلات' });
    }

    const userCache = new Map();
    const allZkIds = [...new Set(records.map(r => String(r.zkUserId || r.deviceUserId || '')))].filter(Boolean);
    if (allZkIds.length > 0) {
      const foundUsers = await User.find({
        $or: [
          { zkUserId: { $in: allZkIds } },
          { employeeId: { $in: allZkIds } }
        ]
      }).lean();
      for (const u of foundUsers) {
        userCache.set(u.zkUserId, u);
        if (u.employeeId) userCache.set(u.employeeId, u);
      }
    }

    const dateStrings = [...new Set(records.map(r => {
      const ts = new Date(r.timestamp);
      return isNaN(ts.getTime()) ? null : ts.toISOString().split('T')[0];
    }))].filter(Boolean);
    const minDate = new Date(Math.min(...dateStrings.map(d => new Date(d).getTime())));
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(Math.max(...dateStrings.map(d => new Date(d).getTime())));
    maxDate.setHours(23, 59, 59, 999);
    const existingAll = await Attendance.find({
      date: { $gte: minDate, $lte: maxDate }
    }).lean();
    const existingMap = new Map();
    for (const e of existingAll) {
      const eNorm = new Date(e.date);
      eNorm.setHours(0, 0, 0, 0);
      const eDateKey = eNorm.toISOString().split('T')[0];
      const key = e.employee
        ? `emp_${e.employee}_${eDateKey}`
        : `dev_${e.deviceUserId}_${eDateKey}`;
      existingMap.set(key, e);
    }

    const groups = new Map();
    for (const record of records) {
      const ts = new Date(record.timestamp);
      if (isNaN(ts.getTime())) continue;

      const { dayStart } = getDayRange(ts);
      const rawZkId = String(record.zkUserId || record.deviceUserId || '');
      const user = userCache.get(rawZkId) || null;
      const dateStr = dayStart.toISOString().split('T')[0];
      const groupKey = user
        ? `emp_${user._id}_${dateStr}`
        : `dev_${rawZkId}_${dateStr}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { user, zkId: rawZkId, dateStr, dayStart, timestamps: [], existing: existingMap.get(groupKey) || null });
      }
      const group = groups.get(groupKey);
      group.timestamps.push(ts);
    }

    let saved = 0;
    let skipped = 0;
    const results = [];
    const bulkOps = [];
    const updateOps = [];
    const deviceLogBulk = [];

    for (const [, group] of groups) {
      const existing = group.existing;
      if (existing) {
        const existingTimes = new Set(group.timestamps.map(t => t.getTime()));
        if (existing.checkIn && existing.checkIn.time) {
          const t = new Date(existing.checkIn.time);
          if (!existingTimes.has(t.getTime())) group.timestamps.push(t);
        }
        if (existing.checkOut && existing.checkOut.time) {
          const t = new Date(existing.checkOut.time);
          if (!existingTimes.has(t.getTime())) group.timestamps.push(t);
        }
      }

      group.timestamps.sort((a, b) => a - b);
      const checkInTime = group.timestamps[0];
      const checkOutTime = group.timestamps.length > 1 && (group.timestamps[group.timestamps.length - 1] - checkInTime > 60000)
        ? group.timestamps[group.timestamps.length - 1]
        : null;

      const checkInStatus = determineCheckInStatus(checkInTime);
      const hasCheckOut = checkOutTime !== null;
      const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      if (existing) {
        const currentCheckIn = existing.checkIn && existing.checkIn.time ? new Date(existing.checkIn.time).getTime() : null;
        const currentCheckOut = existing.checkOut && existing.checkOut.time ? new Date(existing.checkOut.time).getTime() : null;
        const needsCheckInUpdate = !currentCheckIn || currentCheckIn !== checkInTime.getTime();
        const needsCheckOutUpdate = checkOutTime && (!currentCheckOut || currentCheckOut !== checkOutTime.getTime());

        if (needsCheckInUpdate || needsCheckOutUpdate) {
          const updateData = {};
          if (needsCheckInUpdate) {
            updateData['checkIn.time'] = checkInTime;
            updateData['checkIn.status'] = checkInStatus;
            updateData['checkIn.location'] = 'جهاز بصمة';
            updateData['checkIn.notes'] = 'تسجيل بصمة';
            updateData.status = attendanceStatus;
            updateData.lateReason = attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null;
            deviceLogBulk.push({ insertOne: { document: {
              deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
              timestamp: checkInTime, eventType: 'checkin',
              deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
              deviceName: source || 'bridge'
            }}});
          }
          if (needsCheckOutUpdate) {
            const { duration, overtime } = calcDurationOvertime(checkInTime, checkOutTime);
            updateData['checkOut.time'] = checkOutTime;
            updateData['checkOut.location'] = 'جهاز بصمة';
            updateData['checkOut.notes'] = 'تسجيل بصمة';
            updateData.duration = duration;
            updateData.overtime = overtime;
            deviceLogBulk.push({ insertOne: { document: {
              deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
              timestamp: checkOutTime, eventType: 'checkout',
              deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
              deviceName: source || 'bridge'
            }}});
          }
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: { $set: updateData }
            }
          });
          saved++;
          results.push({ id: existing._id, action: 'queued_update', fields: Object.keys(updateData) });
        } else {
          skipped++;
          results.push({ id: existing._id, action: 'no_change', skipped: true });
        }
      } else {
        const doc = {
          date: group.user ? group.dayStart : checkInTime,
          expectedHours: 7,
          status: attendanceStatus,
          checkIn: { time: checkInTime, status: checkInStatus, location: 'جهاز بصمة', notes: 'تسجيل بصمة' },
          lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
        };
        if (group.user) {
          doc.employee = group.user._id;
          doc.department = group.user.department || null;
        } else {
          doc.deviceUserId = group.zkId;
          doc.deviceUserName = `مستخدم جهاز #${group.zkId}`;
        }
        if (checkOutTime) {
          const { duration, overtime } = calcDurationOvertime(checkInTime, checkOutTime);
          doc.checkOut = { time: checkOutTime, location: 'جهاز بصمة', notes: 'تسجيل بصمة' };
          doc.duration = duration;
          doc.overtime = overtime;
        }
        bulkOps.push({ insertOne: { document: doc } });
        deviceLogBulk.push({ insertOne: { document: {
          deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
          timestamp: checkInTime, eventType: 'checkin',
          deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
          deviceName: source || 'bridge'
        }}});
        if (checkOutTime) {
          deviceLogBulk.push({ insertOne: { document: {
            deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
            timestamp: checkOutTime, eventType: 'checkout',
            deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
            deviceName: source || 'bridge'
          }}});
        }
        saved++;
        results.push({ zkUserId: group.zkId, date: group.dateStr, action: 'queued_create' });
      }
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }
    if (updateOps.length > 0) {
      await Attendance.bulkWrite(updateOps, { ordered: false });
    }
    if (deviceLogBulk.length > 0) {
      await DeviceLog.bulkWrite(deviceLogBulk, { ordered: false });
    }

    // Check for stop-requested leaves for users who just fingerprinted
    for (const [, group] of groups) {
      if (group.user && group.timestamps.length > 0) {
        processStopByFingerprint(group.user._id, group.dayStart).catch(e =>
          console.error('[stop-by-fingerprint] Error:', e.message)
        );
      }
    }

    res.json({
      success: true,
      saved,
      skipped,
      total: records.length,
      source: source || 'bridge',
      results
    });
  } catch (err) {
    console.error('خطأ في استقبال سجلات الحضور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getBridgeStatus(req, res) {
  const serviceStatus = zktecoService.getStatus();
  res.json({
    success: true,
    data: {
      bridgeKeyConfigured: !!BRIDGE_KEY,
      status: 'active',
      lastPing: new Date().toISOString(),
      serviceConnected: serviceStatus.connected,
      lastSync: serviceStatus.lastSync
    }
  });
}

async function syncDeviceAttendance(req, res) {
  try {
    const allRecords = await zktecoService.getAttendanceRecords();
    if (!allRecords || allRecords.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد سجلات جديدة في الجهاز',
        data: { synced: 0, total: 0 }
      });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setHours(0, 0, 0, 0);
    const records = allRecords.filter(r => {
      const t = r.recordTime || r.timestamp || r.time;
      if (!t) return true;
      return new Date(t) >= twoMonthsAgo;
    });
    console.log(`[zkteco] فلترة: ${allRecords.length} سجل إجمالاً → ${records.length} سجل (آخر شهرين)`);

    const mappedRecords = records.map(r => zktecoService.mapRecord(r));

    const allZkIds = [...new Set(mappedRecords.map(r => String(r.zkUserId || r.deviceUserId || '')))].filter(Boolean);
    const userCache = new Map();
    if (allZkIds.length > 0) {
      const foundUsers = await User.find({
        $or: [
          { zkUserId: { $in: allZkIds } },
          { employeeId: { $in: allZkIds } }
        ]
      }).lean();
      for (const u of foundUsers) {
        userCache.set(u.zkUserId, u);
        if (u.employeeId) userCache.set(u.employeeId, u);
      }
    }

    const dateStrings = [...new Set(mappedRecords.map(r => {
      const ts = new Date(r.timestamp);
      return isNaN(ts.getTime()) ? null : ts.toISOString().split('T')[0];
    }))].filter(Boolean);
    const minDate = new Date(Math.min(...dateStrings.map(d => new Date(d).getTime())));
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(Math.max(...dateStrings.map(d => new Date(d).getTime())));
    maxDate.setHours(23, 59, 59, 999);

    const existingAll = await Attendance.find({
      date: { $gte: minDate, $lte: maxDate }
    }).lean();
    const existingMap = new Map();
    for (const e of existingAll) {
      const eNorm = new Date(e.date);
      eNorm.setHours(0, 0, 0, 0);
      const eDateKey = eNorm.toISOString().split('T')[0];
      const key = e.employee
        ? `emp_${e.employee}_${eDateKey}`
        : `dev_${e.deviceUserId}_${eDateKey}`;
      existingMap.set(key, e);
    }

    const groups = new Map();
    for (const record of mappedRecords) {
      const ts = new Date(record.timestamp);
      if (isNaN(ts.getTime())) continue;

      const { dayStart } = getDayRange(ts);
      const rawZkId = String(record.zkUserId || record.deviceUserId || '');
      const user = userCache.get(rawZkId) || null;
      const dateStr = dayStart.toISOString().split('T')[0];
      const groupKey = user
        ? `emp_${user._id}_${dateStr}`
        : `dev_${rawZkId}_${dateStr}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { user, zkId: rawZkId, dateStr, dayStart, timestamps: [], existing: existingMap.get(groupKey) || null });
      }
      groups.get(groupKey).timestamps.push(ts);
    }

    let saved = 0;
    let skipped = 0;
    const details = [];
    const bulkOps = [];
    const updateOps = [];
    const deviceLogBulk = [];

    for (const [, group] of groups) {
      const existing = group.existing;
      if (existing) {
        const existingTimes = new Set(group.timestamps.map(t => t.getTime()));
        if (existing.checkIn && existing.checkIn.time) {
          const t = new Date(existing.checkIn.time);
          if (!existingTimes.has(t.getTime())) group.timestamps.push(t);
        }
        if (existing.checkOut && existing.checkOut.time) {
          const t = new Date(existing.checkOut.time);
          if (!existingTimes.has(t.getTime())) group.timestamps.push(t);
        }
      }

      group.timestamps.sort((a, b) => a - b);
      const checkInTime = group.timestamps[0];
      const checkOutTime = group.timestamps.length > 1 && (group.timestamps[group.timestamps.length - 1] - checkInTime > 60000)
        ? group.timestamps[group.timestamps.length - 1]
        : null;

      const checkInStatus = determineCheckInStatus(checkInTime);
      const hasCheckOut = checkOutTime !== null;
      const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      const deviceName = `ZKTeco_${process.env.ZK_IP || '192.168.15.50'}`;

      if (existing) {
        const currentCheckIn = existing.checkIn && existing.checkIn.time ? new Date(existing.checkIn.time).getTime() : null;
        const currentCheckOut = existing.checkOut && existing.checkOut.time ? new Date(existing.checkOut.time).getTime() : null;
        const needsCheckInUpdate = !currentCheckIn || currentCheckIn !== checkInTime.getTime();
        const needsCheckOutUpdate = checkOutTime && (!currentCheckOut || currentCheckOut !== checkOutTime.getTime());

        if (needsCheckInUpdate || needsCheckOutUpdate) {
          const updateData = {};
          if (needsCheckInUpdate) {
            updateData['checkIn.time'] = checkInTime;
            updateData['checkIn.status'] = checkInStatus;
            updateData['checkIn.location'] = 'جهاز بصمة';
            updateData['checkIn.notes'] = 'تزامن مباشر';
            updateData.status = attendanceStatus;
            updateData.lateReason = attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null;
            deviceLogBulk.push({ insertOne: { document: {
              deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
              timestamp: checkInTime, eventType: 'checkin',
              deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
              deviceName
            }}});
          }
          if (needsCheckOutUpdate) {
            const { duration, overtime } = calcDurationOvertime(checkInTime, checkOutTime);
            updateData['checkOut.time'] = checkOutTime;
            updateData['checkOut.location'] = 'جهاز بصمة';
            updateData['checkOut.notes'] = 'تزامن مباشر';
            updateData.duration = duration;
            updateData.overtime = overtime;
            deviceLogBulk.push({ insertOne: { document: {
              deviceUserId: group.zkId, employee: group.user ? group.user._id : null,
              timestamp: checkOutTime, eventType: 'checkout',
              deviceUserName: group.user ? null : `مستخدم جهاز #${group.zkId}`,
              deviceName
            }}});
          }
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: { $set: updateData }
            }
          });
          saved++;
          details.push({ id: existing._id, action: 'queued_update', fields: Object.keys(updateData) });
        } else {
          skipped++;
          details.push({ id: existing._id, action: 'no_change', skipped: true });
        }
      } else {
        if (!group.user) {
          skipped++;
          deviceLogBulk.push({ insertOne: { document: {
            deviceUserId: group.zkId, employee: null,
            timestamp: checkInTime, eventType: 'checkin',
            deviceUserName: `مستخدم جهاز #${group.zkId}`,
            deviceName
          }}});
          details.push({ zkUserId: group.zkId, date: group.dateStr, action: 'skipped_no_mapping' });
          continue;
        }
        const doc = {
          date: group.dayStart,
          expectedHours: 7,
          status: attendanceStatus,
          checkIn: { time: checkInTime, status: checkInStatus, location: 'جهاز بصمة', notes: 'تزامن مباشر' },
          lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null,
          employee: group.user._id,
          department: group.user.department || null
        };
        if (checkOutTime) {
          const { duration, overtime } = calcDurationOvertime(checkInTime, checkOutTime);
          doc.checkOut = { time: checkOutTime, location: 'جهاز بصمة', notes: 'تزامن مباشر' };
          doc.duration = duration;
          doc.overtime = overtime;
        }
        bulkOps.push({ insertOne: { document: doc } });
        deviceLogBulk.push({ insertOne: { document: {
          deviceUserId: group.zkId, employee: group.user._id,
          timestamp: checkInTime, eventType: 'checkin',
          deviceUserName: null,
          deviceName
        }}});
        if (checkOutTime) {
          deviceLogBulk.push({ insertOne: { document: {
            deviceUserId: group.zkId, employee: group.user._id,
            timestamp: checkOutTime, eventType: 'checkout',
            deviceUserName: null,
            deviceName
          }}});
        }
        saved++;
        details.push({ zkUserId: group.zkId, date: group.dateStr, action: 'queued_create' });
      }
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }
    if (updateOps.length > 0) {
      await Attendance.bulkWrite(updateOps, { ordered: false });
    }
    if (deviceLogBulk.length > 0) {
      await DeviceLog.bulkWrite(deviceLogBulk, { ordered: false });
    }

    // Check for stop-requested leaves for users who just fingerprinted
    for (const [, group] of groups) {
      if (group.user && group.timestamps.length > 0) {
        processStopByFingerprint(group.user._id, group.dayStart).catch(e =>
          console.error('[stop-by-fingerprint] Error:', e.message)
        );
      }
    }

    res.json({
      success: true,
      message: `تمت المزامنة: ${saved} جديد, ${skipped} مكرر`,
      data: {
        synced: saved,
        skipped,
        total: mappedRecords.length,
        details
      }
    });
  } catch (err) {
    console.error('خطأ في مزامنة الجهاز:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function testDeviceConnection(req, res) {
  try {
    const result = await zktecoService.testConnection();
    res.json({
      success: result.success,
      message: result.message,
      data: {
        deviceIp: result.config?.ip,
        devicePort: result.config?.port,
        deviceInfo: result.deviceInfo,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getDeviceUsers(req, res) {
  try {
    const users = await zktecoService.getUsers();
    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function pullDeviceAttendance(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const deviceUsers = await zktecoService.getUsers();
    const allAttendanceRecords = await zktecoService.getAttendanceRecords();

    if (!allAttendanceRecords || allAttendanceRecords.length === 0) {
      return res.json({ success: true, data: { records: [], count: 0, rawSample: null } });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setHours(0, 0, 0, 0);
    const attendanceRecords = allAttendanceRecords.filter(r => {
      const t = r.recordTime || r.timestamp || r.time;
      if (!t) return true;
      return new Date(t) >= twoMonthsAgo;
    });

    const deviceUserMap = {};
    if (deviceUsers && deviceUsers.length) {
      for (const du of deviceUsers) {
        const key = String(du.userId || du.user_id || du.id || du.deviceUserId || '');
        deviceUserMap[key] = du;
      }
    }

    const mapped = attendanceRecords.map(r => zktecoService.mapRecord(r));

    const groups = {};
    for (const record of mapped) {
      const ts = new Date(record.timestamp);
      if (isNaN(ts.getTime())) continue;

      if (startDate || endDate) {
        if (startDate && ts < new Date(startDate)) continue;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (ts > end) continue;
        }
      }

      const dateKey = ts.toISOString().split('T')[0];
      const groupKey = `${record.zkUserId}_${dateKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = { zkUserId: record.zkUserId, date: dateKey, records: [] };
      }
      groups[groupKey].records.push(record);
    }

    const result = [];
    for (const [, group] of Object.entries(groups)) {
      group.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const first = group.records[0];
      const last = group.records[group.records.length - 1];

      const deviceUser = deviceUserMap[group.zkUserId];
      const dbUser = await findUserByZkId(group.zkUserId);

      result.push({
        zkUserId: group.zkUserId,
        employeeId: dbUser?._id?.toString() || group.zkUserId || '-',
        employeeName: dbUser?.name || deviceUser?.name || 'غير معروف',
        department: dbUser?.department || '-',
        deviceUserId: group.zkUserId,
        fingerprintUid: deviceUser?.uid !== undefined ? String(deviceUser.uid) : (deviceUser ? '?' : '-'),
        fingerprintCount: deviceUser?.fingerprintCount || deviceUser?.fpCount || '?',
        date: group.date,
        checkInTime: first.timestamp instanceof Date ? first.timestamp.toISOString() : first.timestamp,
        checkOutTime: group.records.length > 1
          ? (last.timestamp instanceof Date ? last.timestamp.toISOString() : last.timestamp)
          : null,
        totalScans: group.records.length,
        deviceName: first.deviceName
      });
    }

    result.sort((a, b) => {
      const dateCmp = new Date(b.date) - new Date(a.date);
      if (dateCmp !== 0) return dateCmp;
      return String(a.zkUserId).localeCompare(String(b.zkUserId));
    });

    res.json({
      success: true,
      data: {
        records: result,
        count: result.length,
        totalFromDevice: mapped.length
      }
    });
  } catch (err) {
    console.error('خطأ في سحب الحضور من الجهاز:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getDeviceStatusMonitor(req, res) {
  try {
    const status = await zktecoService.getDeviceStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function cleanSyncDeviceAttendance(req, res) {
  try {
    const allRecords = await zktecoService.getAttendanceRecords();
    if (!allRecords || allRecords.length === 0) {
      return res.json({ success: true, message: 'لا توجد سجلات في الجهاز', data: { deleted: 0, created: 0 } });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setHours(0, 0, 0, 0);
    const records = allRecords.filter(r => {
      const t = r.recordTime || r.timestamp || r.time;
      if (!t) return true;
      return new Date(t) >= twoMonthsAgo;
    });

    const mappedRecords = records.map(r => zktecoService.mapRecord(r));

    const allZkIds = [...new Set(mappedRecords.map(r => String(r.zkUserId || r.deviceUserId || '')))].filter(Boolean);
    const userCache = new Map();
    if (allZkIds.length > 0) {
      const foundUsers = await User.find({
        $or: [
          { zkUserId: { $in: allZkIds } },
          { employeeId: { $in: allZkIds } }
        ]
      }).lean();
      for (const u of foundUsers) {
        userCache.set(u.zkUserId, u);
        if (u.employeeId) userCache.set(u.employeeId, u);
      }
    }

    const groups = new Map();
    for (const record of mappedRecords) {
      const ts = new Date(record.timestamp);
      if (isNaN(ts.getTime())) continue;

      const rawZkId = String(record.zkUserId || record.deviceUserId || '');
      const user = userCache.get(rawZkId);
      if (!user) continue;

      const dayStart = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
      const dateStr = dayStart.toISOString().split('T')[0];
      const groupKey = `emp_${user._id}_${dateStr}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { user, zkId: rawZkId, dateStr, dayStart, timestamps: [] });
      }
      groups.get(groupKey).timestamps.push(ts);
    }

    for (const [, group] of groups) {
      group.timestamps.sort((a, b) => a - b);
      group.checkInTime = group.timestamps[0];
      group.checkOutTime = group.timestamps.length > 1 && (group.timestamps[group.timestamps.length - 1] - group.checkInTime > 60000)
        ? group.timestamps[group.timestamps.length - 1]
        : null;
    }

    const mappedUserIds = [...new Set([...groups.values()].map(g => g.user._id))];
    const dates = [...new Set([...groups.values()].map(g => g.dayStart))];
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())) + 24 * 60 * 60 * 1000);

    const deleteResult = await Attendance.deleteMany({
      employee: { $in: mappedUserIds },
      date: { $gte: minDate, $lte: maxDate }
    });

    let created = 0;
    const bulkOps = [];
    for (const [, group] of groups) {
      const checkInTime = group.checkInTime;
      const checkOutTime = group.checkOutTime;
      const checkInStatus = determineCheckInStatus(checkInTime);
      const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

      const doc = {
        employee: group.user._id,
        department: group.user.department || null,
        date: group.dayStart,
        expectedHours: 7,
        status: attendanceStatus,
        checkIn: { time: checkInTime, status: checkInStatus, location: 'جهاز بصمة', notes: 'مزامنة وتنظيف' },
        lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
      };
      if (checkOutTime) {
        const { duration, overtime } = calcDurationOvertime(checkInTime, checkOutTime);
        doc.checkOut = { time: checkOutTime, location: 'جهاز بصمة', notes: 'مزامنة وتنظيف' };
        doc.duration = duration;
        doc.overtime = overtime;
      }
      bulkOps.push({ insertOne: { document: doc } });
      created++;
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }

    // Check for stop-requested leaves for users who just fingerprinted
    for (const [, group] of groups) {
      if (group.user && group.timestamps.length > 0) {
        processStopByFingerprint(group.user._id, group.dayStart).catch(e =>
          console.error('[stop-by-fingerprint] Error:', e.message)
        );
      }
    }

    res.json({
      success: true,
      message: `تم التنظيف: حذف ${deleteResult.deletedCount} سجل مكرر، إنشاء ${created} سجل نظيف`,
      data: {
        deleted: deleteResult.deletedCount,
        created,
        total: groups.size,
        users: mappedUserIds.length
      }
    });
  } catch (err) {
    console.error('خطأ في المزامنة الكاملة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getRecentBiometricActivity(req, res) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const seen = new Set();
    const all = [];

    const logs = await DeviceLog.find({
      timestamp: { $gte: todayStart, $lt: todayEnd }
    })
      .sort({ timestamp: -1 })
      .populate('employee', 'name email department')
      .lean();

    for (const r of logs) {
      const key = `${r.employee?._id || r.deviceUserId || ''}_${r.timestamp.getTime()}_${r.eventType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({
        id: r._id,
        employeeName: r.employee?.name || r.deviceUserName || 'غير معروف',
        employeeDepartment: r.employee?.department || '-',
        timestamp: r.timestamp,
        eventType: r.eventType,
        eventLabel: r.eventType === 'checkin' ? 'دخول' : r.eventType === 'checkout' ? 'خروج' : 'بصمة',
        isMapped: !!r.employee,
        deviceUserId: r.deviceUserId || null
      });
    }

    const attendance = await Attendance.find({
      date: { $gte: todayStart, $lt: todayEnd }
    })
      .populate('employee', 'name email department')
      .lean();

    for (const r of attendance) {
      const empId = r.employee?._id || r.deviceUserId || '';
      if (r.checkIn && r.checkIn.time) {
        const key = `${empId}_${new Date(r.checkIn.time).getTime()}_checkin`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({
            id: `${r._id}_in`,
            employeeName: r.employee?.name || r.deviceUserName || 'غير معروف',
            employeeDepartment: r.employee?.department || r.department || '-',
            timestamp: r.checkIn.time,
            eventType: 'checkin',
            eventLabel: 'دخول',
            isMapped: !!r.employee,
            deviceUserId: r.deviceUserId || null
          });
        }
      }
      if (r.checkOut && r.checkOut.time) {
        const key = `${empId}_${new Date(r.checkOut.time).getTime()}_checkout`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({
            id: `${r._id}_out`,
            employeeName: r.employee?.name || r.deviceUserName || 'غير معروف',
            employeeDepartment: r.employee?.department || r.department || '-',
            timestamp: r.checkOut.time,
            eventType: 'checkout',
            eventLabel: 'خروج',
            isMapped: !!r.employee,
            deviceUserId: r.deviceUserId || null
          });
        }
      }
    }

    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: all, count: all.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getErrorLogs(req, res) {
  try {
    const { page = 1, limit = 20, resolved, errorType } = req.query;
    const query = {};
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (errorType) query.errorType = errorType;

    const total = await BiometricErrorLog.countDocuments(query);
    const logs = await BiometricErrorLog.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('employee', 'name email')
      .populate('resolvedBy', 'name email')
      .lean();

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createErrorLog(req, res) {
  try {
    const log = await BiometricErrorLog.create({
      deviceUserId: req.body.deviceUserId || null,
      employee: req.body.employee || null,
      errorType: req.body.errorType || 'unknown',
      errorMessage: req.body.errorMessage || 'خطأ غير معروف',
      rawData: req.body.rawData || null,
      deviceIp: req.body.deviceIp || null
    });
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function resolveErrorLog(req, res) {
  try {
    const log = await BiometricErrorLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        resolutionNote: req.body.resolutionNote || null
      },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ success: false, message: 'سجل الخطأ غير موجود' });
    }
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function mapUserToDevice(req, res) {
  try {
    const { userId, deviceUserId } = req.body;
    if (!userId || !deviceUserId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم ومعرف الجهاز مطلوبان' });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    existingUser.zkUserId = String(deviceUserId);
    await existingUser.save();

    const updatedRecords = await Attendance.updateMany(
      { deviceUserId: String(deviceUserId), employee: { $exists: false } },
      { $set: { employee: existingUser._id, department: existingUser.department } }
    );

    res.json({
      success: true,
      message: `تم ربط المستخدم ${existingUser.name} بمعرف الجهاز ${deviceUserId}`,
      data: {
        user: { id: existingUser._id, name: existingUser.name, email: existingUser.email },
        deviceUserId,
        attendanceRecordsUpdated: updatedRecords.modifiedCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function unmapUserFromDevice(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const previousDeviceId = user.zkUserId;
    user.zkUserId = null;
    await user.save();

    res.json({
      success: true,
      message: `تم فك ربط المستخدم ${user.name} من معرف الجهاز ${previousDeviceId}`,
      data: { user: { id: user._id, name: user.name } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getUnmappedDeviceUsers(req, res) {
  try {
    const showAll = req.query.showAll === 'true';
    const deviceUsers = await zktecoService.getUsers();
    if (!deviceUsers || deviceUsers.length === 0) {
      return res.json({ success: true, data: { deviceUsers: [], count: 0 } });
    }

    const deviceUserIds = deviceUsers.map(u => String(u.userId || u.user_id || u.id || '')).filter(Boolean);
    const mappedUsers = await User.find({ zkUserId: { $in: deviceUserIds } }).select('zkUserId name email department').lean();
    const mappedByZkId = {};
    mappedUsers.forEach(u => { mappedByZkId[u.zkUserId] = u; });
    const mappedIds = new Set(mappedUsers.map(u => u.zkUserId));

    let result;
    if (showAll) {
      result = deviceUsers.map(u => {
        const id = String(u.userId || u.user_id || u.id || '');
        const mappedUser = mappedByZkId[id];
        return {
          ...u,
          isMapped: mappedIds.has(id),
          mappedTo: mappedUser ? { name: mappedUser.name, email: mappedUser.email, department: mappedUser.department } : null
        };
      });
    } else {
      result = deviceUsers.filter(u => {
        const id = String(u.userId || u.user_id || u.id || '');
        return !mappedIds.has(id);
      });
    }

    result.sort((a, b) => {
      const idA = parseInt(a.userId ?? a.user_id ?? a.id ?? 0, 10);
      const idB = parseInt(b.userId ?? b.user_id ?? b.id ?? 0, 10);
      return idA - idB;
    });

    res.json({
      success: true,
      data: {
        deviceUsers: result,
        totalDeviceUsers: deviceUsers.length,
        mappedCount: mappedUsers.length,
        unmappedCount: deviceUsers.length - mappedIds.size
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getSystemUsersForMapping(req, res) {
  try {
    const { search } = req.query;
    const query = { isActive: true };
    if (search && typeof search === 'string') {
      // Escape special regex characters to prevent ReDoS and injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    const users = await User.find(query)
      .select('name email username department zkUserId role')
      .sort({ name: 1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: users, count: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getBiometricDashboardStats(req, res) {
  try {
    const totalAttendance = await Attendance.countDocuments();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.countDocuments({ date: { $gte: todayStart } });
    const mappedUsers = await User.countDocuments({ zkUserId: { $ne: null, $exists: true } });
    const totalUsers = await User.countDocuments({ isActive: true, role: { $ne: 'admin' } });
    const unmappedUsers = totalUsers - mappedUsers;
    const totalErrors = await BiometricErrorLog.countDocuments();
    const unresolvedErrors = await BiometricErrorLog.countDocuments({ resolved: false });
    const deviceStatus = await zktecoService.getDeviceStatus();

    let deviceUsersCount = 0;
    try {
      const deviceUsers = await zktecoService.getUsers();
      if (deviceUsers && Array.isArray(deviceUsers)) {
        deviceUsersCount = deviceUsers.length;
      }
    } catch (e) {
      // device might be offline
    }

    res.json({
      success: true,
      data: {
        totalAttendance,
        todayAttendance,
        mappedUsers,
        totalUsers,
        unmappedUsers,
        deviceUsersCount,
        totalErrors,
        unresolvedErrors,
        deviceOnline: deviceStatus.online,
        deviceLastSync: deviceStatus.lastSync,
        mappingRate: totalUsers > 0 ? Math.round((mappedUsers / totalUsers) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getMappedUsersActivity(req, res) {
  try {
    const { days = 7 } = req.query;

    const mappedUsers = await User.find({
      zkUserId: { $ne: null, $exists: true },
      isActive: true
    })
      .select('name email department zkUserId')
      .sort({ name: 1 })
      .lean();

    if (mappedUsers.length === 0) {
      return res.json({ success: true, data: { users: [], totalUsers: 0 } });
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    const userIds = mappedUsers.map(u => u._id);
    const attendanceRecords = await Attendance.find({
      employee: { $in: userIds },
      date: { $gte: start, $lte: end }
    })
      .sort({ date: -1, 'checkIn.time': -1 })
      .lean();

    const attendanceMap = {};
    for (const r of attendanceRecords) {
      const uid = String(r.employee);
      if (!attendanceMap[uid]) attendanceMap[uid] = [];
      attendanceMap[uid].push({
        id: r._id,
        date: r.date,
        checkIn: r.checkIn?.time || null,
        checkOut: r.checkOut?.time || null,
        status: r.status,
        duration: r.duration
      });
    }

    const users = mappedUsers.map(u => ({
      ...u,
      attendance: attendanceMap[String(u._id)] || [],
      totalRecords: attendanceMap[String(u._id)]?.length || 0
    }));

    res.json({
      success: true,
      data: { users, totalUsers: mappedUsers.length, dateRange: { start, end } }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function bulkMapUsers(req, res) {
  try {
    const { mappings } = req.body;
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد تعيينات' });
    }

    const seenDeviceIds = new Set();
    const validMappings = [];
    const results = [];

    for (const mapping of mappings) {
      if (!mapping.deviceUserId || String(mapping.deviceUserId).trim() === '') {
        results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'failed', error: 'deviceUserId مطلوب' });
        continue;
      }
      if (!mapping.userId) {
        results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'failed', error: 'userId مطلوب' });
        continue;
      }
      const deviceIdKey = String(mapping.deviceUserId).trim();
      if (seenDeviceIds.has(deviceIdKey)) {
        results.push({ userId: mapping.userId, deviceUserId: deviceIdKey, status: 'failed', error: 'deviceUserId مكرر في نفس الدفعة' });
        continue;
      }
      seenDeviceIds.add(deviceIdKey);
      validMappings.push({ ...mapping, deviceIdKey });
    }

    // Use bulkWrite instead of sequential find + save
    if (validMappings.length > 0) {
      const bulkOps = validMappings.map(mapping => ({
        updateOne: {
          filter: { _id: mapping.userId },
          update: { $set: { zkUserId: mapping.deviceIdKey } }
        }
      }));
      const bulkResult = await User.bulkWrite(bulkOps);

      validMappings.forEach((mapping, i) => {
        const matchedCount = bulkResult.matchedCounts ? bulkResult.matchedCounts[i] : 1;
        if (matchedCount > 0) {
          results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'mapped' });
        } else {
          results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'failed', error: 'مستخدم غير موجود' });
        }
      });
    }

    const successCount = results.filter(r => r.status === 'mapped').length;

    res.json({
      success: true,
      message: `تم ربط ${successCount} من أصل ${mappings.length} مستخدم بنجاح`,
      data: { successCount, total: mappings.length, results }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function relinkDeviceLogs(req, res) {
  try {
    const users = await User.find({ zkUserId: { $ne: null, $exists: true } })
      .select('_id zkUserId name')
      .lean();

    let updated = 0;
    for (const user of users) {
      const result = await DeviceLog.updateMany(
        { deviceUserId: user.zkUserId, employee: null },
        { $set: { employee: user._id, deviceUserName: user.name } }
      );
      updated += result.modifiedCount;
    }

    res.json({
      success: true,
      message: `تم ربط ${updated} سجل بصمة بالمستخدمين`,
      data: { updated, totalUsers: users.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  verifyBridge,
  receiveAttendance,
  getBridgeStatus,
  syncDeviceAttendance,
  cleanSyncDeviceAttendance,
  testDeviceConnection,
  getDeviceUsers,
  pullDeviceAttendance,
  getDeviceStatusMonitor,
  getRecentBiometricActivity,
  getErrorLogs,
  createErrorLog,
  resolveErrorLog,
  mapUserToDevice,
  unmapUserFromDevice,
  getUnmappedDeviceUsers,
  getSystemUsersForMapping,
  getBiometricDashboardStats,
  bulkMapUsers,
  getMappedUsersActivity,
  relinkDeviceLogs
};
