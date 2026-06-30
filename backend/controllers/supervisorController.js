const { Attendance } = require('../models/Attendance');
const { User } = require('../models/User');
const { CheckExact, CHECKEXACT_ACTIONS } = require('../models/CheckExact');
const DeviceLog = require('../models/DeviceLog');
const pdfService = require('../services/pdfService');
const Holiday = require('../models/Holiday');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { LeaveRequest } = require('../models/LeaveRequest');

function getDayRange(date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

async function getSupervisorDashboard(req, res) {
  try {
    const { date, startDate, endDate, employeeId, action } = req.query;
    let dayStart, dayEnd;
    if (startDate && endDate) {
      dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      dayEnd = new Date(endDate);
      dayEnd.setHours(23, 59, 59, 999);
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const range = getDayRange(targetDate);
      dayStart = range.dayStart;
      dayEnd = range.dayEnd;
    }

    const [deviceLogs, checkExacts, finalAttendance, users] = await Promise.all([
      DeviceLog.find({
        timestamp: { $gte: dayStart, $lt: dayEnd }
      }).sort({ timestamp: -1 }).lean(),

      CheckExact.find({
        date: { $gte: dayStart, $lt: dayEnd }
      }).populate('employee', 'name email department')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 }).lean(),

      Attendance.find({
        date: { $gte: dayStart, $lt: dayEnd }
      }).populate('employee', 'name email department zkUserId')
        .sort({ 'checkIn.time': -1 }).lean(),

      User.find({ isActive: true })
        .select('name email department zkUserId role')
        .sort({ name: 1 }).lean()
    ]);

    return res.json({
      success: true,
      data: {
        rawLogs: deviceLogs,
        manualOverrides: checkExacts,
        finalAttendance,
        users,
        dateRange: { dayStart, dayEnd }
      }
    });
  } catch (err) {
    console.error('Supervisor dashboard error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getRawLogs(req, res) {
  try {
    const { startDate, endDate, employeeId, deviceUserId, limit = 200 } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }
    if (deviceUserId) query.deviceUserId = deviceUserId;
    if (employeeId) query.employee = employeeId;

    const logs = await DeviceLog.find(query)
      .populate('employee', 'name email department')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getManualOverrides(req, res) {
  try {
    const { startDate, endDate, deviceUserId, action, limit = 200 } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    if (deviceUserId) query.deviceUserId = deviceUserId;
    if (action) query.action = action;

    const overrides = await CheckExact.find(query)
      .populate('employee', 'name email department')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, data: overrides, count: overrides.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getFinalAttendance(req, res) {
  try {
    const { startDate, endDate, employeeId, department, status, limit = 200 } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    if (employeeId) query.employee = employeeId;
    if (department) query.department = department;
    if (status) query.status = status;

    const records = await Attendance.find(query)
      .populate('employee', 'name email department zkUserId')
      .sort({ date: -1, 'checkIn.time': -1 })
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, data: records, count: records.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createManualOverride(req, res) {
  try {
    const { deviceUserId, timestamp, action, reason } = req.body;

    if (!deviceUserId || !timestamp || !action) {
      return res.status(400).json({
        success: false,
        message: 'deviceUserId, timestamp, action مطلوبة'
      });
    }

    if (![CHECKEXACT_ACTIONS.ISADD, CHECKEXACT_ACTIONS.ISDELETE].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action يجب أن يكون ISADD أو ISDELETE'
      });
    }

    const ts = new Date(timestamp);
    const { dayStart } = getDayRange(ts);

    const user = await User.findOne({ zkUserId: String(deviceUserId) });

    const override = await CheckExact.create({
      deviceUserId: String(deviceUserId),
      employee: user ? user._id : null,
      timestamp: ts,
      date: dayStart,
      action,
      reason: reason || '',
      createdBy: req.user ? req.user._id : null,
      source: 'manual'
    });

    return res.status(201).json({
      success: true,
      message: action === CHECKEXACT_ACTIONS.ISADD
        ? 'تم إضافة تعليمة إضافة سجل'
        : 'تم إضافة تعليمة إخفاء سجل',
      data: override
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteManualOverride(req, res) {
  try {
    const { id } = req.params;
    const override = await CheckExact.findByIdAndDelete(id);
    if (!override) {
      return res.status(404).json({ success: false, message: 'التعليمة غير موجودة' });
    }
    return res.json({ success: true, message: 'تم حذف التعليمة' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getDeviceUsersForSupervisor(req, res) {
  try {
    const users = await User.find({ isActive: true, zkUserId: { $ne: null, $exists: true } })
      .select('name email department zkUserId')
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getSupervisorStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayRawCount,
      todayOverrideCount,
      todayAttendanceCount,
      totalOverrides,
      totalISADD,
      totalISDELETE
    ] = await Promise.all([
      DeviceLog.countDocuments({ timestamp: { $gte: today, $lt: tomorrow } }),
      CheckExact.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
      CheckExact.countDocuments(),
      CheckExact.countDocuments({ action: CHECKEXACT_ACTIONS.ISADD }),
      CheckExact.countDocuments({ action: CHECKEXACT_ACTIONS.ISDELETE })
    ]);

    return res.json({
      success: true,
      data: {
        todayRawCount,
        todayOverrideCount,
        todayAttendanceCount,
        totalOverrides,
        totalISADD,
        totalISDELETE
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function downloadAttendancePDF(req, res) {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    let records, employeeName, department;
    if (employeeId) {
      query.employee = employeeId;
      const user = await User.findById(employeeId).lean();
      employeeName = user?.name || 'غير معروف';
      department = user?.department || '-';
      records = await Attendance.find(query)
        .sort({ date: -1 })
        .lean();
    } else {
      records = await Attendance.find(query)
        .populate('employee', 'name department')
        .sort({ date: -1 })
        .lean();
      employeeName = 'جميع الموظفين';
      department = '-';
    }

    const period = `${startDate ? new Date(startDate).toLocaleDateString('en-CA') : '---'} → ${endDate ? new Date(endDate).toLocaleDateString('en-CA') : '---'}`;

    const mapped = records.map(r => ({
      date: r.date,
      checkIn: r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '---',
      checkOut: r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '---',
      duration: r.duration ? `${r.duration.toFixed(1)} س` : '-',
      status: r.status === 'present' ? 'حاضر' : r.status === 'absent' ? 'غائب' : r.status === 'late' ? 'متأخر' : r.status === 'half_day' ? 'نصف يوم' : r.status === 'on_leave' ? 'إجازة' : r.status === 'work_from_home' ? 'عمل عن بعد' : r.status || '-'
    }));

    const data = {
      employeeName,
      department,
      period,
      records: mapped
    };

    const buffer = await pdfService.generateAttendancePDF(data);
    const filename = employeeId
      ? `attendance-${employeeId}-${startDate}-${endDate}.pdf`
      : `attendance-all-${startDate}-${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Attendance PDF error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء PDF', error: err.message });
  }
}

async function downloadAttendanceExcel(req, res) {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    let records;
    if (employeeId) {
      query.employee = employeeId;
      records = await Attendance.find(query).sort({ date: -1 }).lean();
    } else {
      records = await Attendance.find(query)
        .populate('employee', 'name department zkUserId')
        .sort({ date: -1 })
        .lean();
    }

    const fmtStatus = s => s === 'present' ? 'حاضر' : s === 'absent' ? 'غائب' : s === 'late' ? 'متأخر' : s === 'half_day' ? 'نصف يوم' : s === 'on_leave' ? 'إجازة' : s === 'work_from_home' ? 'عمل عن بعد' : s || '-';
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-CA') : '-';
    const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '---';

    // ============================================================
    // Sheet 1: قاعدة البيانات
    // ============================================================
    const dbRows = records.map((r, i) => ({
      'م': i + 1,
      'الموظف': r.employee?.name || r.deviceUserName || 'غير معروف',
      'القسم': r.employee?.department || r.department || '-',
      'معرف البصمة': r.employee?.zkUserId || r.deviceUserId || '-',
      'التاريخ': fmtDate(r.date),
      'أول دخول': fmtTime(r.checkIn?.time),
      'آخر خروج': fmtTime(r.checkOut?.time),
      'المدة (س)': r.duration ? parseFloat(r.duration.toFixed(1)) : '-',
      'الحالة': fmtStatus(r.status),
      'إضافي (س)': r.overtime ? parseFloat(r.overtime.toFixed(1)) : '-'
    }));

    const wsDb = XLSX.utils.json_to_sheet(dbRows);
    wsDb['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 15 }, { wch: 14 },
      { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDb, 'قاعدة البيانات');

    // ============================================================
    // Sheet 2: النتيجة (فلترة ديناميكية)
    // ============================================================
    const lastDataRow = dbRows.length + 1;
    const headers = ['م', 'الموظف', 'القسم', 'معرف البصمة', 'التاريخ', 'أول دخول', 'آخر خروج', 'المدة (س)', 'الحالة', 'إضافي (س)'];

    // استخراج أسماء الموظفين الفريدة من قاعدة البيانات
    const uniqueNames = [...new Set(dbRows.map(r => r['الموظف']))].sort();
    const uniqueIds   = [...new Set(dbRows.map(r => r['معرف البصمة']).filter(v => v !== '-'))].sort();

    const wsResult = XLSX.utils.aoa_to_sheet([
      ['نظام فلترة الحضور والانصراف', null, null, null, null, null, null, null, null, null],
      [],
      ['الموظف:', ''],               // B3 = employee name
      ['معرف البصمة:', ''],           // B4 = device ID
      [],
      ['النتائج:', null, null, null, null, null, null, null, null, null],
      headers
    ]);
    wsResult['!cols'] = wsDb['!cols'];
    wsResult['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

    // FILTER formula in cell A8 (row index 7) — dynamic array, spills automatically
    const dataRef = `'قاعدة البيانات'!A$2:J$${lastDataRow}`;
    const nameRef = `'قاعدة البيانات'!B$2:B$${lastDataRow}`;
    const idRef   = `'قاعدة البيانات'!D$2:D$${lastDataRow}`;

    // تفحص (بحث جزئي بالاسم) * (تطابق تام برقم البصمة إن لم يكن فارغاً)
    const formula = `FILTER(${dataRef}, (ISNUMBER(SEARCH($B$3, ${nameRef}))) * IF($B$4="", TRUE, ${idRef}=--$B$4), "لا توجد نتائج")`;

    const cellA8 = XLSX.utils.encode_cell({ r: 7, c: 0 });
    wsResult[cellA8] = { t: 's', f: formula };

    // قائمة الأسماء المتاحة (خانة مساعدة أسفل الجدول)
    const nameListStart = lastDataRow + 10;
    wsResult[XLSX.utils.encode_cell({ r: nameListStart, c: 0 })] = { t: 's', v: 'قائمة الأسماء المتاحة:' };
    uniqueNames.forEach((name, i) => {
      wsResult[XLSX.utils.encode_cell({ r: nameListStart + 1 + i, c: 0 })] = { t: 's', v: name };
    });

    XLSX.utils.book_append_sheet(wb, wsResult, 'النتيجة');

    // ============================================================
    // Write buffer
    // ============================================================
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = employeeId
      ? `attendance-${employeeId}-${startDate || ''}-${endDate || ''}.xlsx`
      : `attendance-all-${startDate || ''}-${endDate || ''}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Attendance Excel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء Excel', error: err.message });
  }
}

async function downloadEmployeeActivityExcel(req, res) {
  try {
    const { employeeId, startDate, endDate } = req.query;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    }

    const query = { employee: employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const [records, user] = await Promise.all([
      Attendance.find(query).sort({ date: -1 }).lean(),
      User.findById(employeeId).select('name email department zkUserId').lean()
    ]);

    let startDt, endDt;
    if (startDate) startDt = new Date(startDate);
    else if (records.length > 0) startDt = new Date(records[records.length - 1].date);
    else startDt = new Date();
    if (endDate) endDt = new Date(endDate);
    else if (records.length > 0) endDt = new Date(records[0].date);
    else endDt = new Date();
    startDt.setHours(0, 0, 0, 0);
    endDt.setHours(0, 0, 0, 0);

    const holidays = await Holiday.find({
      startDate: { $lte: endDt },
      endDate: { $gte: startDt }
    }).select('name startDate endDate').lean();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'نظام الحضور';
    wb.created = new Date();

    _createEmployeeActivitySheet(wb, user, records, startDt, endDt, holidays);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `نشاط_${user?.name || employeeId}_${startDate || ''}_${endDate || ''}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Employee activity Excel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء Excel', error: err.message });
  }
}

async function _createEmployeeActivitySheet(wb, user, records, startDt, endDt, holidays) {
  const holidayDateMap = new Map();
  (holidays || []).forEach(h => {
    const hStart = new Date(h.startDate);
    hStart.setHours(0, 0, 0, 0);
    const hEnd = new Date(h.endDate);
    hEnd.setHours(0, 0, 0, 0);
    const cur = new Date(hStart);
    while (cur <= hEnd) {
      const key = cur.toISOString().split('T')[0];
      if (!holidayDateMap.has(key)) holidayDateMap.set(key, h);
      cur.setDate(cur.getDate() + 1);
    }
  });

  records.forEach(r => {
    const d = new Date(r.date);
    const key = d.toISOString().split('T')[0];
    const hol = holidayDateMap.get(key);
    if (hol) {
      r.isHoliday = true;
      r.holidayName = hol.name;
    }
  });

  const recordMap = new Map();
  records.forEach(r => {
    const key = new Date(r.date).toISOString().split('T')[0];
    recordMap.set(key, r);
  });

  let presentCount = 0, absentCount = 0, lateCount = 0, holidayCount = 0, halfDayCount = 0, leaveCount = 0, wfhCount = 0;
  let totalDuration = 0, totalOvertime = 0;
  let missingCheckInCount = 0, missingCheckOutCount = 0, missingBothCount = 0;

  records.forEach(r => {
    if (r.isHoliday) return;
    const status = r.status || '';
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'half_day') halfDayCount++;
    else if (status === 'on_leave') leaveCount++;
    else if (status === 'work_from_home') wfhCount++;
    totalDuration += r.duration || 0;
    totalOvertime += r.overtime || 0;
    const hasCI = !!r.checkIn?.time;
    const hasCO = !!r.checkOut?.time;
    if (!hasCI && !hasCO) missingBothCount++;
    else if (!hasCI) missingCheckInCount++;
    else if (!hasCO) missingCheckOutCount++;
  });

  const holIter = new Date(startDt);
  while (holIter <= endDt) {
    if (holidayDateMap.has(holIter.toISOString().split('T')[0])) holidayCount++;
    holIter.setDate(holIter.getDate() + 1);
  }
  totalDuration += holidayCount * 7;

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const statusLabels = { present: 'حاضر', absent: 'غائب', late: 'متأخر', half_day: 'نصف يوم', on_leave: 'إجازة', work_from_home: 'عمل عن بعد' };
  const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '---';

  const tableRows = [];
  const iter = new Date(startDt);
  let rowIdx = 0;
  while (iter <= endDt) {
    const key = iter.toISOString().split('T')[0];
    const record = recordMap.get(key);
    const dayOfWeek = iter.getDay();
    const isFriday = dayOfWeek === 5;
    const isHoliday = holidayDateMap.has(key);
    const hol = holidayDateMap.get(key);

    let cells, bg, statusColor = null, notes = '', textColor;

    if (record) {
      const status = record.status || '';
      const isRecHoliday = !!record.isHoliday;
      const statusLabel = isRecHoliday ? 'عطلة' : statusLabels[status] || status || '-';

      if (isRecHoliday) {
        notes = record.holidayName ? `عطلة - ${record.holidayName}` : 'عطلة رسمية';
        bg = 'FFF0F0';
      } else {
        if (status === 'absent') { bg = 'FFEBEE'; statusColor = 'D32F2F'; }
        else if (status === 'late') { bg = 'FFF8E1'; statusColor = 'F57C00'; }
        else if (status === 'half_day') { bg = 'E8F5E9'; }
        else if (isFriday) { bg = '5A5A5A'; textColor = 'FFFFFF'; }
        else { bg = rowIdx % 2 === 0 ? 'F7FAFC' : 'FFFFFF'; }

        const hasCI = !!record.checkIn?.time;
        const hasCO = !!record.checkOut?.time;
        if (!hasCI && !hasCO) notes = 'نقص البصمتين';
        else if (!hasCI) notes = 'نقص بصمة دخول';
        else if (!hasCO) notes = 'نقص بصمة خروج';
      }

      cells = [
        rowIdx + 1,
        iter.toLocaleDateString('en-CA'),
        dayNames[dayOfWeek],
        fmtTime(record.checkIn?.time),
        fmtTime(record.checkOut?.time),
        record.duration ? parseFloat(record.duration.toFixed(1)) : '-',
        statusLabel,
        notes
      ];
    } else if (isHoliday) {
      cells = [
        rowIdx + 1,
        iter.toLocaleDateString('en-CA'),
        dayNames[dayOfWeek],
        '09:00',
        '16:00',
        7,
        'عطلة',
        hol ? `عطلة رسمية - ${hol.name}` : 'عطلة رسمية'
      ];
      bg = 'FFF0F0';
    } else if (isFriday) {
      cells = [
        rowIdx + 1,
        iter.toLocaleDateString('en-CA'),
        dayNames[dayOfWeek],
        '---', '---', '-', '-', 'جمعة'
      ];
      bg = '5A5A5A'; textColor = 'FFFFFF';
    } else {
      cells = [
        rowIdx + 1,
        iter.toLocaleDateString('en-CA'),
        dayNames[dayOfWeek],
        '---', '---', '-', '-', ''
      ];
      bg = rowIdx % 2 === 0 ? 'F7FAFC' : 'FFFFFF';
    }

    tableRows.push({ cells, bg, statusColor, notes, textColor });
    iter.setDate(iter.getDate() + 1);
    rowIdx++;
  }

  const COL_COUNT = 8;
  const lastCol = String.fromCharCode(64 + COL_COUNT);

  const ws = wb.addWorksheet((user?.name || 'موظف').substring(0, 31), { views: [{ rtl: true }] });
  ws.columns = [
    { width: 5 }, { width: 13 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 10 },
    { width: 12 }, { width: 28 }
  ];

  const C = {
    navy: '1A365D', white: 'FFFFFF', gray: '718096',
    lightGray: 'F7FAFC', border: 'E2E8F0', dark: '2D3748',
    green: '38A169', red: 'E53E3E', orange: 'DD6B20',
    purple: '6B46C1'
  };

  const tRow = ws.addRow([`${user?.name || 'موظف'} | ${user?.department || '-'} | معرف: ${user?.zkUserId || '-'}`]);
  ws.mergeCells(`A${tRow.number}:${lastCol}${tRow.number}`);
  tRow.height = 38;
  tRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: C.white } };
  tRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  tRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  const fmtD = (d) => `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
  const pRow = ws.addRow([`\u202Aمن ${fmtD(startDt)} الى ${fmtD(endDt)}\u202C`]);
  ws.mergeCells(`A${pRow.number}:${lastCol}${pRow.number}`);
  pRow.height = 20;
  pRow.getCell(1).font = { italic: true, size: 10, color: { argb: C.gray } };
  pRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  if (tableRows.length === 0) {
    const er = ws.addRow(['لا توجد سجلات للفترة المحددة']);
    ws.mergeCells(`A${er.number}:${lastCol}${er.number}`);
    er.getCell(1).font = { italic: true, size: 11, color: { argb: 'A0AEC0' } };
    er.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    return;
  }

  const headerRow = ws.addRow(['م', 'التاريخ', 'اليوم', 'أول دخول', 'آخر خروج', 'المدة (س)', 'الحالة', 'ملاحظات']);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: C.navy } },
      bottom: { style: 'medium', color: { argb: C.navy } },
      left: { style: 'thin', color: { argb: C.navy } },
      right: { style: 'thin', color: { argb: C.navy } }
    };
  });

  const eng = (v) => v == null || v === '' ? '' : '\u200E' + v;
  tableRows.forEach((tr, i) => {
    const r = ws.addRow(tr.cells.map(c => typeof c === 'number' ? eng(c) : (typeof c === 'string' && c ? eng(c) : c)));
    r.height = 22;
    const fgColor = tr.textColor || C.dark;
    r.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tr.bg || (i % 2 === 0 ? C.lightGray : C.white) } };
      cell.alignment = { horizontal: col === 8 ? 'right' : 'center', vertical: 'middle', wrapText: true };
      cell.font = { name: 'Calibri', size: 10, color: { argb: fgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: C.border } },
        bottom: { style: 'thin', color: { argb: C.border } },
        left: { style: 'thin', color: { argb: C.border } },
        right: { style: 'thin', color: { argb: C.border } }
      };
    });
    if (tr.statusColor) r.getCell(7).font = { bold: true, color: { argb: tr.statusColor }, size: 10 };
    if (tr.notes && !tr.textColor) r.getCell(8).font = { italic: true, color: { argb: C.gray }, size: 10 };
  });

  const lastDataRow = ws.rowCount;
  ws.autoFilter = `A3:${lastCol}${lastDataRow}`;

  ws.addRow([]);
  const sumR = ws.addRow(['مؤشرات الأداء']);
  ws.mergeCells(`A${sumR.number}:${lastCol}${sumR.number}`);
  sumR.height = 28;
  sumR.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: C.white } };
  sumR.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  sumR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  const totalDays = tableRows.length;

  function kpiRow(items, colors) {
    const r = ws.addRow([]);
    r.height = 40;
    [0,1,2,3].forEach(i => {
      if (!items[i]) return;
      const c1 = i*2+1, c2 = i*2+2;
      const l1 = String.fromCharCode(64+c1), l2 = String.fromCharCode(64+c2);
      ws.mergeCells(`${l1}${r.number}:${l2}${r.number}`);
      const cell = r.getCell(c1);
      cell.value = {
        richText: [
          { text: items[i].label + '\n', font: { name: 'Calibri', size: 9, italic: true, color: { argb: '718096' } } },
          { text: '\u200E' + String(items[i].value), font: { name: 'Calibri', size: 14, bold: true, color: { argb: colors[i] || C.dark } } }
        ]
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });
  }

  kpiRow(
    [{label:'إجمالي الأيام',value:totalDays},{label:'حاضر',value:presentCount},{label:'غائب',value:absentCount},{label:'متأخر',value:lateCount}],
    [C.dark, '38A169', 'E53E3E', 'DD6B20']
  );
  kpiRow(
    [{label:'عطلة',value:holidayCount},{label:'ساعات العمل',value:totalDuration.toFixed(1)},{label:'إضافي',value:totalOvertime.toFixed(1)},{label:'نقص دخول',value:missingCheckInCount}],
    ['8B5CF6', C.dark, C.dark, 'E53E3E']
  );
  kpiRow(
    [{label:'نقص خروج',value:missingCheckOutCount},{label:'بدون بصمة',value:missingBothCount},{label:'نصف يوم',value:halfDayCount},{label:'إجازة',value:leaveCount}],
    ['E53E3E', 'E53E3E', C.dark, C.dark]
  );
  kpiRow(
    [{label:'عمل عن بعد',value:wfhCount}],
    ['6B46C1']
  );
}

async function downloadAllEmployeesActivityExcel(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const users = await User.find({
      isActive: true,
      zkUserId: { $exists: true, $ne: null, $ne: '' }
    }).select('name email department zkUserId').lean();

    if (!users.length) {
      return res.status(400).json({ success: false, message: 'لا يوجد موظفون مرتبطون بأجهزة البصمة' });
    }

    const userIds = users.map(u => u._id);

    const query = { employee: { $in: userIds } };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const allRecords = await Attendance.find(query).sort({ date: -1 }).lean();

    const recordsByUser = new Map();
    for (const r of allRecords) {
      const uid = r.employee?.toString();
      if (!uid) continue;
      if (!recordsByUser.has(uid)) recordsByUser.set(uid, []);
      recordsByUser.get(uid).push(r);
    }

    let startDt, endDt;
    if (startDate) startDt = new Date(startDate);
    else if (allRecords.length > 0) startDt = new Date(allRecords[allRecords.length - 1].date);
    else startDt = new Date();
    if (endDate) endDt = new Date(endDate);
    else if (allRecords.length > 0) endDt = new Date(allRecords[0].date);
    else endDt = new Date();
    startDt.setHours(0, 0, 0, 0);
    endDt.setHours(0, 0, 0, 0);

    const holidays = await Holiday.find({
      startDate: { $lte: endDt },
      endDate: { $gte: startDt }
    }).select('name startDate endDate').lean();

    const fmtD = (d) => `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
    const eng = (v) => v == null || v === '' ? '' : '\u200E' + v;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'نظام الحضور';
    wb.created = new Date();

    // Dashboard sheet
    const dashWs = wb.addWorksheet('الكل', { views: [{ rtl: true }] });
    dashWs.columns = [
      { width: 5 }, { width: 22 }, { width: 16 }, { width: 14 },
      { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 12 }, { width: 12 }
    ];

    const dC = { navy: '1A365D', white: 'FFFFFF', border: 'E2E8F0', gray: '718096', lightGray: 'F7FAFC' };

    const dTitle = dashWs.addRow(['تقرير نشاط جميع الموظفين']);
    dashWs.mergeCells('A1:J1');
    dTitle.height = 40;
    dTitle.getCell(1).font = { name: 'Calibri', size: 20, bold: true, color: { argb: dC.white } };
    dTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dC.navy } };
    dTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const dPeriod = dashWs.addRow([`\u202Aمن ${fmtD(startDt)} الى ${fmtD(endDt)}\u202C`]);
    dashWs.mergeCells('A2:J2');
    dPeriod.height = 22;
    dPeriod.getCell(1).font = { italic: true, size: 11, color: { argb: dC.gray } };
    dPeriod.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const dHeader = dashWs.addRow(['م', 'الموظف', 'القسم', 'معرف البصمة', 'إجمالي الأيام', 'حاضر', 'غائب', 'متأخر', 'ساعات العمل', 'ساعات الإضافي']);
    dHeader.height = 28;
    dHeader.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: dC.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dC.navy } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: dC.navy } },
        bottom: { style: 'medium', color: { argb: dC.navy } }
      };
    });

    users.forEach((u, i) => {
      const uid = u._id.toString();
      const recs = recordsByUser.get(uid) || [];
      const present = recs.filter(r => r.status === 'present').length;
      const absent = recs.filter(r => r.status === 'absent').length;
      const late = recs.filter(r => r.status === 'late').length;
      const totalDur = recs.reduce((s, r) => s + (r.duration || 0), 0);
      const totalOvt = recs.reduce((s, r) => s + (r.overtime || 0), 0);
      const r = dashWs.addRow([eng(i + 1), u.name, u.department || '-', u.zkUserId || '-', eng(recs.length), eng(present), eng(absent), eng(late), eng(parseFloat(totalDur.toFixed(1))), eng(parseFloat(totalOvt.toFixed(1)))]);
      r.height = 22;
      r.eachCell((cell, col) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: '2D3748' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? dC.lightGray : dC.white } };
        cell.border = { bottom: { style: 'thin', color: { argb: dC.border } } };
      });
    });

    dashWs.autoFilter = `A3:J${dashWs.rowCount}`;

    // Employee sheets
    for (const user of users) {
      const uid = user._id.toString();
      const records = recordsByUser.get(uid) || [];
      _createEmployeeActivitySheet(wb, user, records, startDt, endDt, holidays);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `نشاط_جميع_الموظفين_${startDate || ''}_${endDate || ''}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('All employees activity Excel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء Excel', error: err.message });
  }
}

async function getEmployeeActivity(req, res) {
  try {
    const { employeeId, startDate, endDate } = req.query;
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'employeeId, startDate, endDate مطلوبة' });
    }

    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(endDate);
    dayEnd.setHours(23, 59, 59, 999);

    const [attendanceRecords, approvedLeaves, holidays] = await Promise.all([
      Attendance.find({
        employee: employeeId,
        date: { $gte: dayStart, $lte: dayEnd }
      }).populate('employee', 'name email department zkUserId')
        .populate('leave', 'type status startDate endDate reason')
        .sort({ date: -1 }).lean(),

      LeaveRequest.find({
        employee: employeeId,
        status: { $in: ['approved', 'synced_to_payroll'] },
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
      }).select('type status startDate endDate reason isHalfDay fingerprintDate fingerprintType')
        .sort({ startDate: -1 }).lean(),

      Holiday.find({
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
      }).select('name startDate endDate type').lean()
    ]);

    return res.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        approvedLeaves,
        holidays
      }
    });
  } catch (err) {
    console.error('Employee activity error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getSupervisorDashboard,
  getRawLogs,
  getManualOverrides,
  getFinalAttendance,
  createManualOverride,
  deleteManualOverride,
  getDeviceUsersForSupervisor,
  getSupervisorStats,
  downloadAttendancePDF,
  downloadAttendanceExcel,
  downloadEmployeeActivityExcel,
  downloadAllEmployeesActivityExcel,
  getEmployeeActivity
};
