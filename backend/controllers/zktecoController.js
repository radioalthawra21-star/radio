const { Attendance, AttendanceStatus, CheckInStatus } = require('../models/Attendance');
const { User } = require('../models/User');
const BiometricErrorLog = require('../models/BiometricErrorLog');
const DeviceLog = require('../models/DeviceLog');
const zktecoService = require('../services/zktecoService');

const BRIDGE_KEY = process.env.BRIDGE_SECRET_KEY || 'my-secret-key';

function verifyBridge(req, res, next) {
  const key = req.headers['x-bridge-key'];
  if (!key || key !== BRIDGE_KEY) {
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
  const checkInTime = new Date(timestamp);
  const workStart = new Date(checkInTime);
  workStart.setHours(9, 0, 0, 0);

  if (checkInTime <= workStart) {
    return CheckInStatus.ON_TIME;
  }
  const diffMinutes = (checkInTime - workStart) / (1000 * 60);
  if (diffMinutes > 120) {
    return CheckInStatus.VERY_LATE;
  }
  return CheckInStatus.LATE;
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
      if (!existingMap.has(key)) existingMap.set(key, []);
      existingMap.get(key).push(e);
    }

    let saved = 0;
    let skipped = 0;
    const results = [];
    const processedKeys = new Set();
    const bulkOps = [];
    const updateOps = [];
    const deviceLogBulk = [];

    for (const record of records) {
      try {
        const ts = new Date(record.timestamp);
        if (isNaN(ts.getTime())) {
          results.push({ zkUserId: record.zkUserId, error: 'timestamp غير صالح' });
          continue;
        }

        const { dayStart, dayEnd } = getDayRange(ts);
        const rawZkId = String(record.zkUserId || record.deviceUserId || '');
        const user = userCache.get(rawZkId) || null;
        const zkId = rawZkId;
        const dateStr = dayStart.toISOString().split('T')[0];

        const dedupKey = user
          ? `emp_${user._id}_${dateStr}_${record.zkRecordId || ''}`
          : `dev_${zkId}_${dateStr}_${record.zkRecordId || ''}`;
        if (processedKeys.has(dedupKey)) {
          results.push({ zkUserId: record.zkUserId, date: dateStr, action: 'duplicate_skipped' });
          skipped++;
          continue;
        }
        processedKeys.add(dedupKey);

        const lookupKey = user
          ? `emp_${user._id}_${dateStr}`
          : `dev_${zkId}_${dateStr}`;
        const existingRecords = existingMap.get(lookupKey) || [];

        const checkInStatus = determineCheckInStatus(ts);
        const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME
          ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        if (existingRecords.length === 0) {
          const doc = {
            date: user ? dayStart : ts,
            expectedHours: 8,
            status: attendanceStatus,
            checkIn: {
              time: ts,
              status: checkInStatus,
              location: 'جهاز بصمة',
              notes: 'تسجيل بصمة'
            },
            lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
          };
          if (user) {
            doc.employee = user._id;
            doc.department = user.department || null;
          } else {
            doc.deviceUserId = zkId;
            doc.deviceUserName = `مستخدم جهاز #${zkId}`;
          }
          results.push({ zkUserId: record.zkUserId, date: dateStr, action: 'queued_create' });
          bulkOps.push({ insertOne: { document: doc } });
          deviceLogBulk.push({ insertOne: { document: {
            deviceUserId: zkId,
            employee: user ? user._id : null,
            timestamp: ts,
            eventType: 'checkin',
            deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
            deviceName: source || 'bridge'
          }}});
          saved++;
        } else {
          const primary = existingRecords[0];
          if (!primary.checkIn || !primary.checkIn.time) {
              deviceLogBulk.push({ insertOne: { document: {
                deviceUserId: zkId,
                employee: user ? user._id : null,
                timestamp: ts,
                eventType: 'checkin',
                deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
                deviceName: source || 'bridge'
              }}});
              results.push({ id: primary._id, action: 'queued_checkin_update' });
              updateOps.push({
              updateOne: {
                filter: { _id: primary._id },
                update: {
                  $set: {
                    'checkIn.time': ts,
                    'checkIn.status': checkInStatus,
                    'checkIn.location': 'جهاز بصمة',
                    'checkIn.notes': 'تسجيل بصمة',
                    status: attendanceStatus,
                    lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
                  }
                }
              }
            });
            saved++;
          } else if (!primary.checkOut || !primary.checkOut.time) {
            const checkInTime = new Date(primary.checkIn.time);
            if (Math.abs(ts - checkInTime) > 60000) {
              const duration = Math.round((ts - checkInTime) / (1000 * 60 * 60) * 100) / 100;
              const overtime = duration > (primary.expectedHours || 8) ? duration - (primary.expectedHours || 8) : 0;
              deviceLogBulk.push({ insertOne: { document: {
                deviceUserId: zkId,
                employee: user ? user._id : null,
                timestamp: ts,
                eventType: 'checkout',
                deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
                deviceName: source || 'bridge'
              }}});
              results.push({ id: primary._id, action: 'queued_checkout_update' });
              updateOps.push({
                updateOne: {
                  filter: { _id: primary._id },
                  update: {
                    $set: {
                      'checkOut.time': ts,
                      'checkOut.location': 'جهاز بصمة',
                      'checkOut.notes': 'تسجيل بصمة',
                      duration,
                      overtime
                    }
                  }
                }
              });
              saved++;
            } else {
              results.push({ id: primary._id, action: 'too_close_to_checkin', skipped: true });
              skipped++;
            }
          } else {
            results.push({ id: primary._id, action: 'already_completed', skipped: true });
            skipped++;
          }
        }
      } catch (err) {
        results.push({ zkUserId: record.zkUserId, error: err.message });
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
    const records = await zktecoService.getAttendanceRecords();
    if (!records || records.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد سجلات جديدة في الجهاز',
        data: { synced: 0, total: 0 }
      });
    }

    const mappedRecords = records.map(r => zktecoService.mapRecord(r));
    let saved = 0;
    let skipped = 0;
    const details = [];

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
      if (!existingMap.has(key)) existingMap.set(key, []);
      existingMap.get(key).push(e);
    }

    const bulkOps = [];
    const updateOps = [];
    const processedKeys = new Set();
    const deviceLogBulk = [];

    for (const record of mappedRecords) {
      try {
        const ts = new Date(record.timestamp);
        if (isNaN(ts.getTime())) {
          details.push({ zkUserId: record.zkUserId, error: 'timestamp غير صالح' });
          continue;
        }

        const { dayStart, dayEnd } = getDayRange(ts);
        const rawZkId = String(record.zkUserId || record.deviceUserId || '');
        const user = await findUserByZkId(rawZkId);
        const zkId = rawZkId;
        const dateStr = dayStart.toISOString().split('T')[0];

        const dedupKey = user
          ? `emp_${user._id}_${dateStr}_${record.zkRecordId || ''}`
          : `dev_${zkId}_${dateStr}_${record.zkRecordId || ''}`;
        if (processedKeys.has(dedupKey)) {
          details.push({ zkUserId: record.zkUserId, date: dateStr, action: 'duplicate_skipped' });
          skipped++;
          continue;
        }
        processedKeys.add(dedupKey);

        const lookupKey = user
          ? `emp_${user._id}_${dateStr}`
          : `dev_${zkId}_${dateStr}`;
        const existingRecords = existingMap.get(lookupKey) || [];

        const checkInStatus = determineCheckInStatus(ts);
        const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME
          ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        if (existingRecords.length === 0) {
          const doc = {
            date: user ? dayStart : ts,
            expectedHours: 8,
            status: attendanceStatus,
            checkIn: {
              time: ts,
              status: checkInStatus,
              location: 'جهاز بصمة',
              notes: 'تزامن مباشر'
            },
            lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
          };
          if (user) {
            doc.employee = user._id;
            doc.department = user.department || null;
          } else {
            doc.deviceUserId = zkId;
            doc.deviceUserName = `مستخدم جهاز #${zkId}`;
          }
          details.push({ zkUserId: record.zkUserId, date: dateStr, action: 'queued_create' });
          bulkOps.push({ insertOne: { document: doc } });
          deviceLogBulk.push({ insertOne: { document: {
            deviceUserId: zkId,
            employee: user ? user._id : null,
            timestamp: ts,
            eventType: 'checkin',
            deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
            deviceName: `ZKTeco_${process.env.ZK_IP || '192.168.15.50'}`
          }}});
          saved++;
        } else {
          const primary = existingRecords[0];
          if (!primary.checkIn || !primary.checkIn.time) {
            deviceLogBulk.push({ insertOne: { document: {
              deviceUserId: zkId,
              employee: user ? user._id : null,
              timestamp: ts,
              eventType: 'checkin',
              deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
              deviceName: `ZKTeco_${process.env.ZK_IP || '192.168.15.50'}`
            }}});
            details.push({ id: primary._id, action: 'queued_checkin_update' });
            updateOps.push({
              updateOne: {
                filter: { _id: primary._id },
                update: {
                  $set: {
                    'checkIn.time': ts,
                    'checkIn.status': checkInStatus,
                    'checkIn.location': 'جهاز بصمة',
                    'checkIn.notes': 'تزامن مباشر',
                    status: attendanceStatus,
                    lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
                  }
                }
              }
            });
            saved++;
          } else if (!primary.checkOut || !primary.checkOut.time) {
            const checkInTime = new Date(primary.checkIn.time);
            if (Math.abs(ts - checkInTime) > 60000) {
              const duration = Math.round((ts - checkInTime) / (1000 * 60 * 60) * 100) / 100;
              const overtime = duration > (primary.expectedHours || 8) ? duration - (primary.expectedHours || 8) : 0;
              deviceLogBulk.push({ insertOne: { document: {
                deviceUserId: zkId,
                employee: user ? user._id : null,
                timestamp: ts,
                eventType: 'checkout',
                deviceUserName: user ? null : `مستخدم جهاز #${zkId}`,
                deviceName: `ZKTeco_${process.env.ZK_IP || '192.168.15.50'}`
              }}});
              details.push({ id: primary._id, action: 'queued_checkout_update' });
              updateOps.push({
                updateOne: {
                  filter: { _id: primary._id },
                  update: {
                    $set: {
                      'checkOut.time': ts,
                      'checkOut.location': 'جهاز بصمة',
                      'checkOut.notes': 'تزامن مباشر',
                      duration,
                      overtime
                    }
                  }
                }
              });
              saved++;
            } else {
              details.push({ id: primary._id, action: 'too_close_to_checkin', skipped: true });
              skipped++;
            }
          } else {
            details.push({ id: primary._id, action: 'already_complete', skipped: true });
            skipped++;
          }
        }
      } catch (err) {
        details.push({ zkUserId: record.zkUserId, error: err.message });
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
    const attendanceRecords = await zktecoService.getAttendanceRecords();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.json({ success: true, data: { records: [], count: 0, rawSample: null } });
    }

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
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
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

    let successCount = 0;
    const results = [];

    for (const mapping of mappings) {
      try {
        const user = await User.findById(mapping.userId);
        if (!user) {
          results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'failed', error: 'مستخدم غير موجود' });
          continue;
        }
        user.zkUserId = String(mapping.deviceUserId);
        await user.save();
        successCount++;
        results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'mapped', userName: user.name });
      } catch (err) {
        results.push({ userId: mapping.userId, deviceUserId: mapping.deviceUserId, status: 'failed', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `تم ربط ${successCount} من أصل ${mappings.length} مستخدم بنجاح`,
      data: { successCount, total: mappings.length, results }
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
  getMappedUsersActivity
};
