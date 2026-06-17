const { Attendance } = require('../models/Attendance');
const { User } = require('../models/User');
const { CheckExact, CHECKEXACT_ACTIONS } = require('../models/CheckExact');
const DeviceLog = require('../models/DeviceLog');
const pdfService = require('../services/pdfService');

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

    const XLSX = require('xlsx');

    // ============================================================
    // Sheet 1: قاعدة البيانات
    // ============================================================
    const dbRows = records.map((r, i) => ({
      '#': i + 1,
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
    const headers = ['#', 'الموظف', 'القسم', 'معرف البصمة', 'التاريخ', 'أول دخول', 'آخر خروج', 'المدة (س)', 'الحالة', 'إضافي (س)'];

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

    // Fill missing dates within range
    let startDt, endDt;
    if (startDate) startDt = new Date(startDate);
    else if (records.length > 0) startDt = new Date(records[records.length - 1].date);
    else startDt = new Date();
    if (endDate) endDt = new Date(endDate);
    else if (records.length > 0) startDt = new Date(records[0].date);
    else endDt = new Date();
    startDt.setHours(0, 0, 0, 0);
    endDt.setHours(0, 0, 0, 0);

    const recordDateSet = new Set(records.map(r => {
      const d = new Date(r.date);
      return d.toISOString().split('T')[0];
    }));

    const missingDates = [];
    const cursor = new Date(startDt);
    while (cursor <= endDt) {
      const key = cursor.toISOString().split('T')[0];
      if (!recordDateSet.has(key)) {
        missingDates.push({ date: new Date(cursor), isMissing: true });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Merge records + missing dates, sorted desc
    const allRows = [
      ...records.map(r => ({ ...r, isMissing: false })),
      ...missingDates
    ];
    allRows.sort((a, b) => new Date(b.date) - new Date(a.date));

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'نظام الحضور';
    wb.created = new Date();

    const ws = wb.addWorksheet('نشاط الموظف', { views: [{ rtl: true }] });

    const COL_COUNT = 8; // A-H

    // Column widths
    ws.columns = [
      { header: '#', key: 'num', width: 5 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'أول دخول', key: 'checkIn', width: 14 },
      { header: 'آخر خروج', key: 'checkOut', width: 14 },
      { header: 'المدة (س)', key: 'duration', width: 10 },
      { header: 'الحالة', key: 'status', width: 14 },
      { header: 'إضافي (س)', key: 'overtime', width: 10 },
      { header: 'ملاحظات', key: 'notes', width: 35 }
    ];

    // Colors
    const DARK_BLUE = '1E3C6E';
    const MEDIUM_BLUE = '2B5797';
    const LIGHT_BLUE = 'D6E4F0';
    const WHITE = 'FFFFFF';
    const LIGHT_GRAY = 'F5F5F5';
    const DARK_GRAY = '333333';
    const GREEN_BG = 'E6FFE6';
    const RED_BG = 'FFE6E6';
    const YELLOW_BG = 'FFF8E1';
    const ORANGE_BG = 'FFF3E0';

    const lastCol = String.fromCharCode(64 + COL_COUNT); // H

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
    };

    const DATA_START_ROW = 4; // data starts at row 4
    const HEADER_ROW = 4;

    // Row 1: Title
    const titleRow = ws.addRow(['تقرير نشاط الموظف']);
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);
    titleRow.height = 40;
    const titleCell = titleRow.getCell(1);
    titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Employee info
    const infoRow = ws.addRow([`الموظف: ${user?.name || 'غير معروف'}`, null, null, null, `القسم: ${user?.department || '-'}`, null, null, `معرف البصمة: ${user?.zkUserId || '-'}`]);
    infoRow.height = 24;
    infoRow.getCell(1).font = { bold: true, size: 12, color: { argb: DARK_BLUE } };
    infoRow.getCell(5).font = { bold: true, size: 12, color: { argb: DARK_BLUE } };
    infoRow.getCell(8).font = { bold: true, size: 12, color: { argb: DARK_BLUE } };
    infoRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    infoRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    infoRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 3: Date range
    const periodRow = ws.addRow([`الفترة: ${startDate || '---'} → ${endDate || '---'}`, null, null, null, null, null, null, null]);
    periodRow.height = 22;
    periodRow.getCell(1).font = { italic: true, size: 11, color: { argb: '666666' } };
    periodRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    // Header row (row 4)
    const headerRow = ws.addRow(['#', 'التاريخ', 'أول دخول', 'آخر خروج', 'المدة (س)', 'الحالة', 'إضافي (س)', 'ملاحظات']);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MEDIUM_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '1E3C6E' } },
        left: { style: 'thin', color: { argb: '1E3C6E' } },
        bottom: { style: 'medium', color: { argb: '1E3C6E' } },
        right: { style: 'thin', color: { argb: '1E3C6E' } }
      };
    });

    // Status map
    const statusLabels = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر',
      half_day: 'نصف يوم', on_leave: 'إجازة', work_from_home: 'عمل عن بعد'
    };

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-CA') : '-';
    const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '---';
    const isFriday = d => { const day = new Date(d).getDay(); return day === 5; };
    const FRIDAY_BG = 'F0E6FF';

    // Track missing stats
    let missingCheckInCount = 0;
    let missingCheckOutCount = 0;
    let missingBothCount = 0;
    let noRecordAtAllCount = 0;

    // Data rows
    allRows.forEach((r, i) => {
      const isEven = i % 2 === 0;

      let notes = '';
      let rowBg = isEven ? LIGHT_GRAY : WHITE;
      let statusLabel = '-';
      let statusColor = null;
      let hasDuration = false;
      let hasOvertime = false;
      let checkInStr = '---';
      let checkOutStr = '---';
      let durStr = '-';
      let overtimeStr = '-';

      if (r.isMissing) {
        notes = 'لا توجد بصمة ولا سجل حضور';
        rowBg = 'E8E0F0';
        noRecordAtAllCount++;
      } else {
        const status = r.status || '';
        statusLabel = statusLabels[status] || status || '-';

        const hasCheckIn = r.checkIn?.time ? true : false;
        const hasCheckOut = r.checkOut?.time ? true : false;

        if (!hasCheckIn && !hasCheckOut) {
          notes = 'لا توجد بصمة دخول ولا خروج';
          missingBothCount++;
        } else if (!hasCheckIn) {
          notes = 'لا توجد بصمة دخول';
          missingCheckInCount++;
        } else if (!hasCheckOut) {
          notes = 'لا توجد بصمة خروج';
          missingCheckOutCount++;
        }

        checkInStr = fmtTime(r.checkIn?.time);
        checkOutStr = fmtTime(r.checkOut?.time);
        durStr = r.duration ? parseFloat(r.duration.toFixed(1)) : '-';
        overtimeStr = r.overtime ? parseFloat(r.overtime.toFixed(1)) : '-';
        hasDuration = !!r.duration;
        hasOvertime = !!r.overtime;

        if (status === 'absent' || status === 'late') {
          rowBg = RED_BG;
          statusColor = 'CC0000';
        } else if (status === 'present') {
          rowBg = GREEN_BG;
          statusColor = '006600';
        } else if (status === 'half_day') {
          rowBg = YELLOW_BG;
          statusColor = '996600';
        }

        if (notes && !r.isMissing) {
          rowBg = ORANGE_BG;
        }
      }

      // Highlight Friday
      if (isFriday(r.date)) {
        rowBg = FRIDAY_BG;
      }

      const rowData = [i + 1, fmtDate(r.date), checkInStr, checkOutStr, durStr, statusLabel, overtimeStr, notes];
      const row = ws.addRow(rowData);
      row.height = 24;

      row.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.alignment = { horizontal: colNum === 8 ? 'right' : 'center', vertical: 'middle', wrapText: true };
        cell.font = { name: 'Calibri', size: 11, color: { argb: DARK_GRAY } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CCCCCC' } },
          left: { style: 'thin', color: { argb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
          right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
      });

      if (statusColor) {
        row.getCell(6).font = { bold: true, color: { argb: statusColor }, size: 11 };
      }
      if (hasDuration) {
        row.getCell(5).font = { bold: true, color: { argb: DARK_BLUE }, size: 11 };
      }
      if (notes) {
        row.getCell(8).font = { italic: true, color: { argb: r.isMissing ? '6633AA' : 'CC6600' }, size: 11 };
      }
    });

    // Summary section
    const lastDataRow = DATA_START_ROW + allRows.length; // last data row number

    if (records.length > 0) {
      ws.addRow([]);
      const summaryLabelRow = ws.addRow(['الملخص']);
      ws.mergeCells(`A${summaryLabelRow.number}:${lastCol}${summaryLabelRow.number}`);
      summaryLabelRow.height = 28;
      const slCell = summaryLabelRow.getCell(1);
      slCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } };
      slCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
      slCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const dr = `B${DATA_START_ROW + 1}:B${lastDataRow}`; // date range
      const durR = `E${DATA_START_ROW + 1}:E${lastDataRow}`; // duration range
      const ovtR = `G${DATA_START_ROW + 1}:G${lastDataRow}`; // overtime range
      const stR = `F${DATA_START_ROW + 1}:F${lastDataRow}`; // status range

      const summaryMain = [
        ['إجمالي الأيام', `=ROWS(${durR})`],
        ['أيام الحضور', `=COUNTIF(${stR},"حاضر")`],
        ['أيام الغياب', `=COUNTIF(${stR},"غائب")`],
        ['أيام التأخير', `=COUNTIF(${stR},"متأخر")`],
        ['إجمالي ساعات العمل', `=IFERROR(SUM(${durR}),0)`],
        ['إجمالي ساعات الإضافي', `=IFERROR(SUM(${ovtR}),0)`]
      ];

      summaryMain.forEach(([label, formula], i) => {
        const row = ws.addRow([label, null, null, null, null, null, null, null]);
        row.height = 24;
        const isEven = i % 2 === 0;
        const bg = isEven ? LIGHT_BLUE : WHITE;

        row.getCell(1).value = label;
        row.getCell(1).font = { bold: true, size: 11, color: { argb: DARK_BLUE } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'CCCCCC' } } };

        row.getCell(2).value = { formula: formula.startsWith('=') ? formula.substring(1) : formula };
        row.getCell(2).font = { bold: true, size: 11, color: { argb: DARK_GRAY } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'CCCCCC' } } };
      });

      // Missing punch summary
      ws.addRow([]);
      const missingLabelRow = ws.addRow(['حالات البصمات الناقصة']);
      ws.mergeCells(`A${missingLabelRow.number}:${lastCol}${missingLabelRow.number}`);
      missingLabelRow.height = 28;
      const mlCell = missingLabelRow.getCell(1);
      mlCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } };
      mlCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B74530' } };
      mlCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const missingData = [
        ['عدد حالات نقص بصمة الدخول', missingCheckInCount],
        ['عدد حالات نقص بصمة الخروج', missingCheckOutCount],
        ['عدد حالات نقص البصمتين معاً', missingBothCount],
        ['أيام بدون أي سجل حضور', noRecordAtAllCount]
      ];

      missingData.forEach(([label, value], i) => {
        const row = ws.addRow([label, value, null, null, null, null, null, null]);
        row.height = 24;
        const isEven = i % 2 === 0;
        const bg = isEven ? 'FFF3E0' : WHITE;
        const valColor = value > 0 ? 'B74530' : '006600';
        row.getCell(1).font = { bold: true, size: 11, color: { argb: 'B74530' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'CCCCCC' } } };
        row.getCell(2).font = { bold: true, size: 12, color: { argb: valColor } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'CCCCCC' } } };
      });
    }

    // No records row
    if (records.length === 0) {
      const emptyRow = ws.addRow(['لا توجد سجلات للفترة المحددة']);
      ws.mergeCells(`A${emptyRow.number}:${lastCol}${emptyRow.number}`);
      emptyRow.height = 30;
      emptyRow.getCell(1).font = { italic: true, size: 12, color: { argb: '999999' } };
      emptyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }

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

    const [attendanceRecords, approvedLeaves] = await Promise.all([
      Attendance.find({
        employee: employeeId,
        date: { $gte: dayStart, $lte: dayEnd }
      }).populate('employee', 'name email department zkUserId')
        .populate('leave', 'type status startDate endDate reason')
        .sort({ date: -1 }).lean(),

      require('../models/LeaveRequest').LeaveRequest.find({
        employee: employeeId,
        status: { $in: ['approved', 'synced_to_payroll'] },
        startDate: { $lte: dayEnd },
        endDate: { $gte: dayStart }
      }).select('type status startDate endDate reason isHalfDay fingerprintDate fingerprintType')
        .sort({ startDate: -1 }).lean()
    ]);

    return res.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        approvedLeaves
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
  getEmployeeActivity
};
