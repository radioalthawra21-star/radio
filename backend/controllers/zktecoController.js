const { Attendance, AttendanceStatus, CheckInStatus } = require('../models/Attendance');
const { User } = require('../models/User');
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

    let saved = 0;
    let skipped = 0;
    const results = [];
    const processedKeys = new Set();

    for (const record of records) {
      try {
        const ts = new Date(record.timestamp);
        if (isNaN(ts.getTime())) {
          results.push({ zkUserId: record.zkUserId, error: 'timestamp غير صالح' });
          continue;
        }

        const { dayStart, dayEnd } = getDayRange(ts);
        const user = await findUserByZkId(record.zkUserId);

        if (!user) {
          results.push({ zkUserId: record.zkUserId, error: 'لا يوجد موظف مرتبط بهذا المعرف', skipped: true });
          skipped++;
          continue;
        }

        const dateStr = dayStart.toISOString().split('T')[0];
        const dedupKey = `${user._id}_${dateStr}_${record.zkRecordId || ''}`;
        if (processedKeys.has(dedupKey)) {
          results.push({ zkUserId: record.zkUserId, date: dateStr, action: 'duplicate_skipped' });
          skipped++;
          continue;
        }
        processedKeys.add(dedupKey);

        const existing = await Attendance.findOne({
          employee: user._id,
          date: { $gte: dayStart, $lt: dayEnd }
        });

        if (existing) {
          if (!existing.checkIn || !existing.checkIn.time) {
            existing.checkIn = {
              time: ts,
              status: determineCheckInStatus(ts),
              location: 'جهاز بصمة',
              notes: 'تسجيل بصمة'
            };
            existing.status = determineCheckInStatus(ts) !== CheckInStatus.ON_TIME
              ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
            if (existing.status === AttendanceStatus.LATE) {
              existing.lateReason = 'تسجيل متأخر عبر جهاز البصمة';
            }
            await existing.save();
            saved++;
            results.push({ id: existing._id, action: 'checkin_updated' });
          } else if (!existing.checkOut || !existing.checkOut.time) {
            const checkInTime = new Date(existing.checkIn.time);
            if (Math.abs(ts - checkInTime) > 60000) {
              existing.checkOut = {
                time: ts,
                location: 'جهاز بصمة',
                notes: 'تسجيل بصمة'
              };
              existing.calculateDuration();
              if (existing.duration > existing.expectedHours) {
                existing.overtime = existing.duration - existing.expectedHours;
              }
              await existing.save();
              saved++;
              results.push({ id: existing._id, action: 'checkout_updated' });
            } else {
              results.push({ id: existing._id, action: 'too_close_to_checkin', skipped: true });
              skipped++;
            }
          } else {
            results.push({ id: existing._id, action: 'already_completed', skipped: true });
            skipped++;
          }
        } else {
          const checkInStatus = determineCheckInStatus(ts);
          const attendanceStatus = checkInStatus !== CheckInStatus.ON_TIME
            ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

          const created = await Attendance.create({
            employee: user._id,
            date: ts,
            department: user.department || null,
            expectedHours: 8,
            status: attendanceStatus,
            checkIn: {
              time: ts,
              status: checkInStatus,
              location: 'جهاز بصمة',
              notes: 'تسجيل بصمة'
            },
            lateReason: attendanceStatus === AttendanceStatus.LATE ? 'تسجيل متأخر عبر جهاز البصمة' : null
          });
          saved++;
          results.push({ id: created._id, action: 'created' });
        }
      } catch (err) {
        results.push({ zkUserId: record.zkUserId, error: err.message });
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
    const records = await zktecoService.getAttendanceRecords();
    if (!records || records.length === 0) {
      return res.json({
        success: true,
        message: 'لا توجد سجلات جديدة في الجهاز',
        data: { synced: 0, total: 0 }
      });
    }

    const mappedRecords = records.map(r => zktecoService.mapRecord(r));
    const { dayStart, dayEnd } = getDayRange(new Date());
    let saved = 0;
    let skipped = 0;
    const details = [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const existingRecords = await Attendance.find({
      date: { $gte: monthStart }
    }).lean();

    const existingMap = new Map();
    for (const rec of existingRecords) {
      const key = `${rec.employee}_${new Date(rec.date).toISOString().split('T')[0]}`;
      existingMap.set(key, rec);
    }

    for (const record of mappedRecords) {
      try {
        const ts = new Date(record.timestamp);
        const user = await findUserByZkId(record.zkUserId);
        if (!user) {
          details.push({ zkUserId: record.zkUserId, action: 'no_user_skipped' });
          skipped++;
          continue;
        }

        const dateKey = `${user._id}_${ts.toISOString().split('T')[0]}`;
        const existing = existingMap.get(dateKey);

        if (existing) {
          if (!existing.checkOut || !existing.checkOut.time) {
            const checkInTime = new Date(existing.checkIn.time);
            if (Math.abs(ts - checkInTime) > 60000) {
              await Attendance.findByIdAndUpdate(existing._id, {
                'checkOut.time': ts,
                'checkOut.location': 'جهاز بصمة',
                'checkOut.notes': 'تزامن مباشر'
              });
              const duration = (ts - checkInTime) / (1000 * 60 * 60);
              const overtime = duration > (existing.expectedHours || 8) ? duration - (existing.expectedHours || 8) : 0;
              await Attendance.findByIdAndUpdate(existing._id, { duration, overtime });
              saved++;
              details.push({ zkUserId: record.zkUserId, action: 'checkout_synced' });
            }
          } else {
            skipped++;
            details.push({ zkUserId: record.zkUserId, action: 'already_exists' });
          }
        } else {
          const checkInStatus = determineCheckInStatus(ts);
          await Attendance.create({
            employee: user._id,
            date: ts,
            department: user.department || null,
            status: checkInStatus !== CheckInStatus.ON_TIME ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
            checkIn: {
              time: ts,
              status: checkInStatus,
              location: 'جهاز بصمة',
              notes: 'تزامن مباشر'
            },
            expectedHours: 8,
            lateReason: checkInStatus !== CheckInStatus.ON_TIME ? 'تسجيل متأخر عبر جهاز البصمة' : null
          });
          saved++;
          details.push({ zkUserId: record.zkUserId, action: 'created' });
        }
      } catch (err) {
        details.push({ zkUserId: record.zkUserId, error: err.message });
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

module.exports = {
  verifyBridge,
  receiveAttendance,
  getBridgeStatus,
  syncDeviceAttendance,
  testDeviceConnection,
  getDeviceUsers
};
