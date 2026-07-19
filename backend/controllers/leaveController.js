const mongoose = require('mongoose');
const { LeaveRequest, LeaveType, LeaveStatus } = require('../models/LeaveRequest');

const { User } = require('../models/User');
const { Attendance } = require('../models/Attendance');
const DailyReport = require('../models/DailyReport');
const Department = require('../models/Department');

const { Notification } = require('../models/Notification');
const { NotificationType } = require('../models/Notification');
const { calculateCompensation, checkFinancialOverlap, syncCompensationToPayroll } = require('../services/compensationService');
const crypto = require('crypto');

const LEAVE_LABELS = {
  annual: 'إجازة إدارية', sick: 'إجازة مرضية', exceptional: 'إجازة استثنائية',
  death: 'إجازة وفاة', hourly: 'إجازة ساعية',
  unpaid: 'إجازة بدون راتب', maternity: 'إجازة وضع',
  compensatory: 'إجازة تعويضية', mission: 'مأمورية', overtime: 'أجر إضافي',
  attendance_correction: 'تصحيح بصمة',
  fingerprint_forgotten: 'نسيان بصمة',
  hajj: 'إجازة حج',
  development: 'إجازة تطوير',
};
const leaveLabel = (type) => LEAVE_LABELS[type] || type;

const emitSocket = (userId, notification) => {
  try { if (global.io) global.io.to(userId.toString()).emit('notification', notification); } catch (e) {}
};

const notifyManager = async (employeeId, leaveRequest) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee || !employee.department) return false;

    const deptDoc = await Department.findById(employee.department).catch(() => null)
      || await Department.findOne({ name: employee.department }).catch(() => null);
    const deptValues = [employee.department];
    if (deptDoc) {
      deptValues.push(deptDoc._id.toString());
      deptValues.push(deptDoc.name);
    }

    const manager = await User.findOne({ role: 'manager', department: { $in: deptValues }, isActive: true });
    if (manager && manager._id.toString() !== employeeId.toString()) {
      const notif = await Notification.createNotification(
        manager._id, NotificationType.LEAVE_REQUESTED,
        'طلب إجازة جديد',
        `تقديم ${employee.name} بطلب ${leaveLabel(leaveRequest.type)}${leaveRequest.startDate ? ' من ' + leaveRequest.startDate.toLocaleDateString('ar-EG') : ''}${leaveRequest.endDate ? ' إلى ' + leaveRequest.endDate.toLocaleDateString('ar-EG') : ''}`,
        leaveRequest._id
      );
      emitSocket(manager._id, notif);
      return true;
    }
    return false;
  } catch (e) { console.error('notifyManager error:', e.message); return false; }
};

const notifyOfficeManager = async (employeeId, leaveRequest) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee || !employee.supervisedBy) return false;

    const officeManager = await User.findOne({ _id: employee.supervisedBy, role: 'office_manager', isActive: true });
    if (!officeManager) return false;

    const notif = await Notification.createNotification(
      officeManager._id, NotificationType.LEAVE_REQUESTED,
      'طلب إجازة جديد',
      `تقديم ${employee.name} بطلب ${leaveLabel(leaveRequest.type)}${leaveRequest.startDate ? ' من ' + leaveRequest.startDate.toLocaleDateString('ar-EG') : ''}${leaveRequest.endDate ? ' إلى ' + leaveRequest.endDate.toLocaleDateString('ar-EG') : ''}`,
      leaveRequest._id
    );
    emitSocket(officeManager._id, notif);
    return true;
  } catch (e) { console.error('notifyOfficeManager error:', e.message); return false; }
};

const notifyAdmin = async (leaveRequest, approvedInfo) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'hr'] }, isActive: true });
    if (admins.length > 0) {
      const employee = await User.findById(leaveRequest.employee);
      const daysMsg = approvedInfo
        ? ` (وافق المدير على ${approvedInfo} يوم من أصل ${leaveRequest.days})`
        : ` (${leaveRequest.days} أيام عمل) - موافقة مدير القسم`;
      for (const admin of admins) {
        const notif = await Notification.createNotification(
          admin._id, NotificationType.LEAVE_NEEDS_GM,
          'طلب إجازة يحتاج موافقة المدير العام',
          `طلب إجازة ${leaveLabel(leaveRequest.type)} للموظف ${employee?.name}${daysMsg} يحتاج موافقتك`,
          leaveRequest._id
        );
        emitSocket(admin._id, notif);
      }
    }
  } catch (e) { console.error('notifyAdmin error:', e.message); }
};

const notifyHR = async (leaveRequest) => {
  try {
    const hr = await User.findOne({ role: 'manager', department: { $in: ['hr', 'human resources', 'الموارد البشرية'] }, isActive: true });
    if (hr) {
      const employee = await User.findById(leaveRequest.employee);
      const notif = await Notification.createNotification(
        hr._id, NotificationType.LEAVE_APPROVED,
        'تمت الموافقة على إجازة',
        `تمت الموافقة على إجازة ${leaveLabel(leaveRequest.type)} للموظف ${employee?.name}`,
        leaveRequest._id
      );
      emitSocket(hr._id, notif);
    }
  } catch (e) { console.error('notifyHR error:', e.message); }
};

const injectFingerprintToDevice = async (leaveRequest, timeDate) => {
  let device = null;
  let success = false;
  try {
    const ZKLib = require('node-zklib');
    const { COMMANDS } = require('node-zklib/constants');
    const ip = process.env.ZK_IP || '192.168.15.50';
    const port = parseInt(process.env.ZK_PORT || '4370');
    device = new ZKLib(ip, port, 5000, 5000);
    await device.createSocket();

    const employee = await User.findById(leaveRequest.employee._id).select('zkUserId');
    if (!employee || !employee.zkUserId) {
      console.log('[injectFingerprintToDevice] No zkUserId for employee, skipping device injection');
      return { success: false, error: 'لا يوجد zkUserId للموظف' };
    }

    const date = new Date(timeDate);
    const year = date.getFullYear() - 2000;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const packedTime = ((((year * 12 + month) * 31 + (day - 1)) * 24 + hour) * 60 + minute) * 60 + second;

    const recordBuf = Buffer.alloc(40);
    recordBuf.writeUInt16LE(0, 0);
    const userIdStr = String(employee.zkUserId).padEnd(9, '\0');
    recordBuf.write(userIdStr, 2, 9, 'ascii');
    recordBuf.writeUInt32LE(packedTime, 27);

    await device.executeCmd(COMMANDS.CMD_DATA_WRRQ, recordBuf);
    console.log(`[injectFingerprintToDevice] Successfully injected attendance for user ${employee.zkUserId}`);
    success = true;
    return { success: true };
  } catch (err) {
    console.error('[injectFingerprintToDevice] Error:', err.message);
    const { BiometricErrorLog } = require('../models/BiometricErrorLog');
    try {
      await BiometricErrorLog.create({
        employee: leaveRequest.employee?._id,
        errorType: 'device_communication',
        errorMessage: `فشل حقن البصمة: ${err.message}`,
        deviceIp: process.env.ZK_IP || '192.168.15.50',
      });
    } catch (logErr) { console.error('Failed to log biometric error:', logErr.message); }
    return { success: false, error: err.message };
  } finally {
    if (device) { try { await device.disconnect(); } catch (e) {} }
  }
};

const approveWithPayrollSync = async (leaveRequest, req) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    let comp;
    if (leaveRequest.type === 'mission') {
      comp = await calculateCompensation({
        employeeId: leaveRequest.employee._id, requestType: 'mission',
        missionType: leaveRequest.missionType, fixedAllowance: leaveRequest.transportAllowance,
      });
    } else if (leaveRequest.type === 'overtime') {
      comp = await calculateCompensation({
        employeeId: leaveRequest.employee._id, requestType: 'overtime',
        hours: leaveRequest.overtimeHours, executionDate: leaveRequest.startDate,
      });
    } else if (leaveRequest.type === 'unpaid') {
      comp = await calculateCompensation({
        employeeId: leaveRequest.employee._id, requestType: 'unpaid',
        days: leaveRequest.days,
      });
    } else if (leaveRequest.type === 'hourly') {
      comp = await calculateCompensation({
        employeeId: leaveRequest.employee._id, requestType: 'hourly',
        hours: leaveRequest.hours || leaveRequest.days * 8,
      });
    }

    if (comp && (comp.amount !== 0 || comp.isDeduction)) {
      const pi = await syncCompensationToPayroll(
        comp, leaveRequest.type, leaveRequest._id, leaveRequest.employee._id,
        'LR-' + leaveRequest._id.toString(),
        { session, createdBy: req.user._id, description: leaveRequest.reason }
      );
      leaveRequest.payrollItemId = pi._id;
      leaveRequest.compensationResult = comp;
    }

    await leaveRequest.save({ session });

    if (leaveRequest.type === 'fingerprint_forgotten' && leaveRequest.fingerprintDate) {
      const rawDate = new Date(leaveRequest.fingerprintDate);
      const dayStart = new Date(rawDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

      let attendance = await Attendance.findOne({
        employee: leaveRequest.employee._id,
        date: { $gte: dayStart, $lt: dayEnd }
      }).session(session);

      const fpTime = leaveRequest.fingerprintTime || (leaveRequest.fingerprintType === 'in' ? '08:00' : '16:00');
      const [fh, fm] = fpTime.split(':').map(Number);
      const timeDate = new Date(dayStart);
      timeDate.setHours(fh || 8, fm || 0, 0, 0);

      if (attendance) {
        if (leaveRequest.fingerprintType === 'in') {
          attendance.checkIn = { ...(attendance.checkIn || {}), time: timeDate, status: 'on_time', notes: 'تعويض نسيان بصمة دخول' };
        } else {
          attendance.checkOut = { ...(attendance.checkOut || {}), time: timeDate, status: 'on_time', notes: 'تعويض نسيان بصمة خروج' };
        }
        attendance.leave = leaveRequest._id;
        if (['absent', undefined, null].includes(attendance.status)) attendance.status = 'present';
        if (!attendance.department && leaveRequest.employee.department) attendance.department = leaveRequest.employee.department;
        await attendance.save({ session });
        console.log(`[fingerprint_forgotten] Updated existing attendance ${attendance._id} for employee ${leaveRequest.employee._id} on ${dayStart}`);
      } else {
        const attData = {
          employee: leaveRequest.employee._id,
          date: new Date(dayStart),
          department: leaveRequest.employee.department,
          status: 'present',
          expectedHours: 7, duration: 0,
          leave: leaveRequest._id,
        };
        if (leaveRequest.fingerprintType === 'in') {
          attData.checkIn = { time: timeDate, status: 'on_time', notes: 'تعويض نسيان بصمة دخول' };
        } else {
          attData.checkOut = { time: timeDate, status: 'on_time', notes: 'تعويض نسيان بصمة خروج' };
        }
        const created = await Attendance.create([attData], { session });
        console.log(`[fingerprint_forgotten] Created attendance ${created[0]._id} for employee ${leaveRequest.employee._id} on ${dayStart}`);
      }
      leaveRequest.days = 1;
      await leaveRequest.save({ session });

      try { await injectFingerprintToDevice(leaveRequest, timeDate); } catch (zkErr) { console.error('[fingerprint_forgotten] Device injection failed:', zkErr.message); }

    } else if (leaveRequest.startDate && leaveRequest.endDate && ['annual', 'sick', 'exceptional', 'death', 'maternity', 'unpaid', 'hajj'].includes(leaveRequest.type)) {
      const current = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);
      while (current <= end) {
        if (current.getDay() !== 5 && current.getDay() !== 6) {
          const dayStart = new Date(current); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(current); dayEnd.setHours(23, 59, 59, 999);
          const existing = await Attendance.findOne({
            employee: leaveRequest.employee._id,
            date: { $gte: dayStart, $lt: dayEnd }
          }).session(session);
          if (!existing) {
            await Attendance.create([{
              employee: leaveRequest.employee._id, date: new Date(current),
              department: leaveRequest.employee.department,
              status: 'on_leave', leave: leaveRequest._id,
              expectedHours: 7, duration: leaveRequest.isHalfDay ? 4 : 8,
            }], { session });
          }
          
          // Create DailyReport entry for approved leave day
          const existingReport = await DailyReport.findOne({
            userId: leaveRequest.employee._id,
            date: { $gte: dayStart, $lt: dayEnd }
          }).session(session);
          
          if (!existingReport) {
            const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const reportDateStr = `${arabicDayNames[current.getDay()]} - ${current.getDate()}/${current.getMonth() + 1}/${current.getFullYear()}`;
            
            await DailyReport.create([{
              userId: leaveRequest.employee._id,
              date: new Date(current),
              employeeName: leaveRequest.employee.name || '',
              department: leaveRequest.employee.department || '',
              jobTitle: leaveRequest.employee.jobTitle || '',
              directManager: '',
              reportDate: reportDateStr,
              achievements: [],
              priorities: { first: '', second: '', third: '' },
              challenges: { obstacles: '', supportRequired: '' },
              suggestions: { performanceVision: '' },
              bestWork: { items: [] },
              isOnVacation: true,
              status: 'submitted'
            }], { session });
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }

    await session.commitTransaction();
  } catch (syncErr) {
    await session.abortTransaction();
    console.error('Atomic payroll sync failed:', syncErr);
    throw syncErr;
  } finally {
    session.endSession();
  }
};

const createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, startTime, endTime, isHalfDay, reason, documents, coveragePlan, fingerprintType, fingerprintDate, fingerprintTime, deathDegree } = req.body;
    const employeeId = req.user._id;

    if (!type || !reason) return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    if (!employee.isActive) return res.status(403).json({ success: false, message: 'لا يمكن تقديم طلب لحساب غير نشط' });

    if (type === 'fingerprint_forgotten') {
      if (!fingerprintType || !fingerprintDate)
        return res.status(400).json({ success: false, message: 'يرجى تحديد نوع البصمة والتاريخ' });
    }

    if (type === 'death' && !deathDegree) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد درجة القرابة (الدرجة الأولى/الثانية/الثالثة)' });
    }

    if (type === 'sick' && (!documents || documents.length === 0)) {
      return res.status(400).json({ success: false, message: 'يرجى إرفاق صورة التقرير الطبي مع طلب الإجازة المرضية' });
    }

    let computedStartDate = startDate ? new Date(startDate) : null;
    let computedEndDate = endDate ? new Date(endDate) : null;
    let computedDays = 0;
    let computedHours = 0;

    // Death leave: auto-calculate days based on degree
    if (type === 'death' && deathDegree && computedStartDate) {
      const Settings = mongoose.model('Settings');
      const dayMap = {
        1: parseInt((await Settings.getValue('leaveDeathFirstDegreeDays', 3)).toString()),
        2: parseInt((await Settings.getValue('leaveDeathSecondDegreeDays', 2)).toString()),
        3: parseInt((await Settings.getValue('leaveDeathThirdDegreeDays', 1)).toString()),
      };
      computedDays = dayMap[deathDegree] || 3;
      computedEndDate = new Date(computedStartDate);
      let remaining = computedDays - 1;
      while (remaining > 0) {
        computedEndDate.setDate(computedEndDate.getDate() + 1);
        if (computedEndDate.getDay() >= 1 && computedEndDate.getDay() <= 5) remaining--;
      }
    }

    // Hajj leave: auto-set to 30 days, starts from selected date
    if (type === 'hajj' && computedStartDate) {
      const hajjDays = parseInt((await mongoose.model('Settings').getValue('leaveHajjDays', 30)).toString());
      computedDays = hajjDays;
      computedEndDate = new Date(computedStartDate);
      let remaining = computedDays - 1;
      while (remaining > 0) {
        computedEndDate.setDate(computedEndDate.getDate() + 1);
        if (computedEndDate.getDay() >= 1 && computedEndDate.getDay() <= 5) remaining--;
      }
    }

    // Development leave: validate weekly hours
    if (type === 'development') {
      if (!startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'يرجى تحديد وقت البداية والنهاية لإجازة التطوير' });
      }
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      computedHours = Math.max(0, (eh + em / 60) - (sh + sm / 60));
      if (computedHours <= 0) {
        return res.status(400).json({ success: false, message: 'وقت غير صحيح' });
      }

      const bal = await LeaveRequest.checkLeaveBalance(employeeId, 'development');
      if (computedHours > bal.remainingHours) {
        return res.status(400).json({
          success: false,
          message: `لا يمكن تجاوز 6 ساعات أسبوعياً. المتبقي هذا الأسبوع: ${bal.remainingHours} ساعة. طلبت: ${computedHours} ساعة`,
        });
      }
      computedDays = 0;
    }

    const leaveRequest = new LeaveRequest({
      employee: employeeId, type, reason, documents: documents || [], department: employee.department,
      coveragePlan,
      startDate: computedStartDate,
      endDate: computedEndDate,
      startTime, endTime, isHalfDay: isHalfDay || false,
      deathDegree: type === 'death' ? deathDegree : null,
      fingerprintType: type === 'fingerprint_forgotten' ? fingerprintType : null,
      fingerprintDate: type === 'fingerprint_forgotten' ? new Date(fingerprintDate) : null,
      fingerprintTime: type === 'fingerprint_forgotten' ? (fingerprintTime || null) : null,
      idempotencyKey: crypto.randomUUID(),
    });

    if (computedStartDate && computedEndDate && computedDays > 0) {
      leaveRequest.days = computedDays;
    } else if (computedStartDate && computedEndDate && type !== 'development' && type !== 'hourly') {
      leaveRequest.calculateDays();
    }
    if (computedHours > 0) leaveRequest.hours = computedHours;

    if (['annual', 'hourly'].includes(type)) {
      const bal = await LeaveRequest.checkLeaveBalance(employeeId, type);
      if (type === 'annual' && leaveRequest.days > bal.remainingBalance)
        return res.status(400).json({ success: false, message: 'رصيد الإجازات غير كافٍ. المتاح: ' + bal.remainingBalance + ' أيام' });
      if (type === 'hourly') {
        const totalAvailableHours = (bal.remainingBalance * 7) + bal.remainingHours;
        if (leaveRequest.hours > totalAvailableHours)
          return res.status(400).json({ success: false, message: 'لا يمكن تجاوز الرصيد. المتاح: ' + bal.remainingBalance + ' يوم و ' + bal.remainingHours + ' ساعة' });
      }
    }

    if (startDate && type !== 'fingerprint_forgotten' && type !== 'development') {
      const end = computedEndDate || computedStartDate;
      const overlap = await checkFinancialOverlap(employeeId, computedStartDate, end, null, { requestType: type });
      if (overlap.hasOverlap)
        return res.status(400).json({ success: false, message: overlap.conflicts.map(c => c.reason).join('; ') });
    }

    // Hajj goes directly to GM
    if (type === 'hajj') {
      leaveRequest.status = LeaveStatus.PENDING_GENERAL_MANAGER;
      await leaveRequest.save();
      await notifyAdmin(leaveRequest);
    } else if (employee.supervisedBy) {
      // Employee has an office manager → office manager approves first
      leaveRequest.status = LeaveStatus.PENDING_OFFICE_MANAGER;
      await leaveRequest.save();
      await notifyOfficeManager(employeeId, leaveRequest);
    } else {
      leaveRequest.status = LeaveStatus.PENDING_MANAGER;
      await leaveRequest.save();

      const managerNotified = await notifyManager(employeeId, leaveRequest);
      if (!managerNotified) {
        leaveRequest.status = LeaveStatus.PENDING_GENERAL_MANAGER;
        await leaveRequest.save();
        await notifyAdmin(leaveRequest);
      }
    }

    res.status(201).json({ success: true, message: 'تم تقديم طلب الإجازة بنجاح', data: { leaveRequest } });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تقديم الطلب' });
  }
};

const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'الحالة مطلوبة' });

    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'name email department');
    if (!leaveRequest) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const prevStatus = leaveRequest.status;
    const isManager = req.user.role === 'manager';
    const isOfficeManager = req.user.role === 'office_manager';
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';

    if (status === LeaveStatus.REJECTED) {
      if (isOfficeManager && leaveRequest.status === LeaveStatus.PENDING_OFFICE_MANAGER) {
        const empDoc = await User.findById(leaveRequest.employee._id || leaveRequest.employee).select('supervisedBy');
        if (!empDoc || empDoc.supervisedBy?.toString() !== req.user._id.toString())
          return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        leaveRequest.status = LeaveStatus.REJECTED;
        leaveRequest.rejectionReason = rejectionReason || '';
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        await leaveRequest.save();
        const rejectNotif = await Notification.createNotification(
          leaveRequest.employee._id, NotificationType.LEAVE_REJECTED,
          'تم رفض طلب الإجازة',
          `تم رفض طلب ${leaveLabel(leaveRequest.type)} من قبل مدير المكتب${rejectionReason ? '. السبب: ' + rejectionReason : ''}`,
          leaveRequest._id
        );
        emitSocket(leaveRequest.employee._id, rejectNotif);
        return res.json({ success: true, message: 'تم الرفض', data: { leaveRequest } });
      }
      if (isManager || isAdmin) {
        if (isManager && leaveRequest.status === LeaveStatus.PENDING_MANAGER) {
          const deptDoc = await Department.findById(req.user.department).catch(() => null)
            || await Department.findOne({ name: req.user.department }).catch(() => null);
          const deptValues = [req.user.department];
          if (deptDoc) {
            deptValues.push(deptDoc._id.toString());
            deptValues.push(deptDoc.name);
          }
          if (!deptValues.includes(leaveRequest.department))
            return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
        if (isManager && leaveRequest.employee._id.toString() === req.user._id.toString())
          return res.status(403).json({ success: false, message: 'لا يمكنك الموافقة أو الرفض على طلبك الخاص - سيتم تحويله للمدير العام' });
        leaveRequest.status = LeaveStatus.REJECTED;
        leaveRequest.rejectionReason = rejectionReason || '';
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        await leaveRequest.save();

        const rejectNotif = await Notification.createNotification(
          leaveRequest.employee._id, NotificationType.LEAVE_REJECTED,
          'تم رفض طلب الإجازة',
          `تم رفض طلب ${leaveLabel(leaveRequest.type)}${rejectionReason ? '. السبب: ' + rejectionReason : ''}`,
          leaveRequest._id
        );
        emitSocket(leaveRequest.employee._id, rejectNotif);

        return res.json({ success: true, message: 'تم الرفض', data: { leaveRequest } });
      }
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    if (status === LeaveStatus.APPROVED) {
      // Office manager approves → goes to department manager
      if (isOfficeManager && leaveRequest.status === LeaveStatus.PENDING_OFFICE_MANAGER) {
        const empDoc = await User.findById(leaveRequest.employee._id || leaveRequest.employee).select('supervisedBy department');
        if (!empDoc || empDoc.supervisedBy?.toString() !== req.user._id.toString())
          return res.status(403).json({ success: false, message: 'غير مصرح لك - هذا الموظف ليس تابعاً لك' });

        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        leaveRequest.status = LeaveStatus.PENDING_MANAGER;
        await leaveRequest.save();

        const managerNotified = await notifyManager(leaveRequest.employee._id, leaveRequest);
        if (!managerNotified) {
          leaveRequest.status = LeaveStatus.PENDING_GENERAL_MANAGER;
          await leaveRequest.save();
          await notifyAdmin(leaveRequest);
        }

        const omApprovedNotif = await Notification.createNotification(
          leaveRequest.employee._id, NotificationType.LEAVE_PENDING_GM,
          'تمت موافقة مدير المكتب مبدئياً',
          `طلب ${leaveLabel(leaveRequest.type)} تمت موافقة مدير المكتب عليه وهو بانتظار موافقة مدير القسم`,
          leaveRequest._id
        );
        emitSocket(leaveRequest.employee._id, omApprovedNotif);
        return res.json({ success: true, message: 'تمت الموافقة. الطلب انتقل لمدير القسم', data: { leaveRequest } });
      }

      if (isManager && leaveRequest.status === LeaveStatus.PENDING_MANAGER) {
        const deptDoc = await Department.findById(req.user.department).catch(() => null)
          || await Department.findOne({ name: req.user.department }).catch(() => null);
        const deptValues = [req.user.department];
        if (deptDoc) {
          deptValues.push(deptDoc._id.toString());
          deptValues.push(deptDoc.name);
        }
        if (!deptValues.includes(leaveRequest.department))
          return res.status(403).json({ success: false, message: 'غير مصرح لك - هذا الموظف ليس في قسمك' });
        if (leaveRequest.employee._id.toString() === req.user._id.toString())
          return res.status(403).json({ success: false, message: 'لا يمكنك الموافقة على طلبك الخاص - سيتم تحويله للمدير العام' });

        const { approvedDays } = req.body;
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();

        const calendarDays = leaveRequest.startDate && leaveRequest.endDate
          ? Math.round(Math.abs(new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1
          : 1;
        if (calendarDays >= 3) {
          if (approvedDays && approvedDays < leaveRequest.days) {
            leaveRequest.managerSuggestedDays = approvedDays;
          } else {
            leaveRequest.managerSuggestedDays = null;
          }
          leaveRequest.status = LeaveStatus.PENDING_GENERAL_MANAGER;
          await leaveRequest.save();
          await notifyAdmin(leaveRequest, leaveRequest.managerSuggestedDays);
          const gmMsg = leaveRequest.managerSuggestedDays
            ? `طلب ${leaveLabel(leaveRequest.type)} (وافق مدير القسم على ${leaveRequest.managerSuggestedDays} يوم من أصل ${leaveRequest.days}) بانتظار موافقة المدير العام`
            : `طلب ${leaveLabel(leaveRequest.type)} (${leaveRequest.days} أيام) تمت موافقة مدير القسم وهو بانتظار موافقة المدير العام`;
          const pendingGmNotif = await Notification.createNotification(
            leaveRequest.employee._id, NotificationType.LEAVE_PENDING_GM,
            'طلب الإجازة بانتظار موافقة المدير العام',
            gmMsg,
            leaveRequest._id
          );
          emitSocket(leaveRequest.employee._id, pendingGmNotif);
          return res.json({ success: true, message: 'تمت الموافقة المبدئية. الطلب بانتظار موافقة المدير العام', data: { leaveRequest } });
        } else {
          leaveRequest.status = LeaveStatus.APPROVED;
          await approveWithPayrollSync(leaveRequest, req);

          const approvedNotif = await Notification.createNotification(
            leaveRequest.employee._id, NotificationType.LEAVE_APPROVED,
            'تمت الموافقة على طلب الإجازة',
            `تمت الموافقة على طلب ${leaveLabel(leaveRequest.type)} من ${leaveRequest.startDate?.toLocaleDateString('ar-EG')} إلى ${leaveRequest.endDate?.toLocaleDateString('ar-EG')}`,
            leaveRequest._id
          );
          emitSocket(leaveRequest.employee._id, approvedNotif);
          await notifyHR(leaveRequest);

          return res.json({ success: true, message: 'تمت الموافقة على طلب الإجازة', data: { leaveRequest } });
        }
      }

      if (isAdmin && leaveRequest.status === LeaveStatus.PENDING_GENERAL_MANAGER) {
        const { approvedDays } = req.body;
        leaveRequest.status = LeaveStatus.APPROVED;
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        if (approvedDays && approvedDays < leaveRequest.days) {
          leaveRequest.days = approvedDays;
          if (leaveRequest.startDate) {
            const newEnd = new Date(leaveRequest.startDate);
            let remaining = approvedDays - 1;
            while (remaining > 0) {
              newEnd.setDate(newEnd.getDate() + 1);
              if (newEnd.getDay() >= 1 && newEnd.getDay() <= 5) remaining--;
            }
            leaveRequest.endDate = newEnd;
          }
        }
        await approveWithPayrollSync(leaveRequest, req);

        const gmApprovedNotif = await Notification.createNotification(
          leaveRequest.employee._id, NotificationType.LEAVE_APPROVED,
          'تمت الموافقة على طلب الإجازة',
          `تمت الموافقة النهائية على طلب ${leaveLabel(leaveRequest.type)} (${leaveRequest.days} يوم) من ${leaveRequest.startDate?.toLocaleDateString('ar-EG')} إلى ${leaveRequest.endDate?.toLocaleDateString('ar-EG')}`,
          leaveRequest._id
        );
        emitSocket(leaveRequest.employee._id, gmApprovedNotif);
        await notifyHR(leaveRequest);

        return res.json({ success: true, message: 'تمت الموافقة النهائية على طلب الإجازة', data: { leaveRequest } });
      }

      if (isAdmin && leaveRequest.status === LeaveStatus.PENDING_MANAGER) {
        leaveRequest.status = LeaveStatus.APPROVED;
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        await approveWithPayrollSync(leaveRequest, req);

        const adminApprovedNotif = await Notification.createNotification(
          leaveRequest.employee._id, NotificationType.LEAVE_APPROVED,
          'تمت الموافقة على طلب الإجازة',
          `تمت الموافقة على طلب ${leaveLabel(leaveRequest.type)}`,
          leaveRequest._id
        );
        emitSocket(leaveRequest.employee._id, adminApprovedNotif);
        await notifyHR(leaveRequest);

        return res.json({ success: true, message: 'تمت الموافقة', data: { leaveRequest } });
      }

      return res.status(400).json({ success: false, message: 'لا يمكن تحديث الحالة الآن' });
    }

    return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الحالة' });
  }
};

const cancelLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'name email department');
    if (!leaveRequest) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    const isOwner = leaveRequest.employee._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin' && req.user.role !== 'hr')
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    if (!['draft', 'pending_office_manager', 'pending_manager', 'pending_general_manager', 'approved', 'synced_to_payroll'].includes(leaveRequest.status))
      return res.status(400).json({ success: false, message: 'لا يمكن إلغاء الطلب بعد المعالجة' });
    const wasApproved = leaveRequest.status === LeaveStatus.APPROVED || leaveRequest.status === 'synced_to_payroll';
    leaveRequest.status = LeaveStatus.CANCELLED;
    await leaveRequest.save();

    if (wasApproved) {
      try {
        await Attendance.deleteMany({ leave: leaveRequest._id });
      } catch (e) { console.error('Error cleaning attendance on cancel:', e.message); }
      try {
        const PayrollItem = mongoose.model('PayrollItem');
        await PayrollItem.updateMany(
          { sourceModel: 'LeaveRequest', sourceId: leaveRequest._id, status: 'active' },
          { $set: { status: 'cancelled' } }
        );
      } catch (e) { console.error('Error cancelling payroll items:', e.message); }
    }

    if (isOwner && leaveRequest.department) {
      try {
        const deptDoc = await Department.findById(leaveRequest.department).catch(() => null)
          || await Department.findOne({ name: leaveRequest.department }).catch(() => null);
        const deptValues = [leaveRequest.department];
        if (deptDoc) {
          deptValues.push(deptDoc._id.toString());
          deptValues.push(deptDoc.name);
        }
        const manager = await User.findOne({ role: 'manager', department: { $in: deptValues }, isActive: true });
        if (manager && manager._id.toString() !== leaveRequest.employee._id.toString()) {
          const cancelNotif = await Notification.createNotification(
            manager._id, NotificationType.LEAVE_CANCELLED,
            'تم إلغاء إجازة من قبل الموظف',
            `ألغى ${leaveRequest.employee?.name} طلب ${leaveLabel(leaveRequest.type)}${leaveRequest.startDate ? ' من ' + leaveRequest.startDate.toLocaleDateString('ar-EG') : ''}${leaveRequest.endDate ? ' إلى ' + leaveRequest.endDate.toLocaleDateString('ar-EG') : ''}`,
            leaveRequest._id
          );
          emitSocket(manager._id, cancelNotif);
        }
      } catch (e) { console.error('notifyManagerOnCancel error:', e.message); }
    }

    res.json({ success: true, message: 'تم إلغاء الطلب بنجاح', data: { leaveRequest } });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في الإلغاء' });
  }
};

const getLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const balances = {};
    const leaveTypes = Object.values(LeaveType);
    // Parallel execution instead of sequential N+1
    const results = await Promise.all(
      leaveTypes.map(type => LeaveRequest.checkLeaveBalance(employeeId, type))
    );
    leaveTypes.forEach((type, i) => {
      balances[type] = results[i];
    });
    res.json({ success: true, data: { balances } });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الرصيد' });
  }
};

const getPendingLeaveRequests = async (req, res) => {
  try {
    let leaveRequests;
    if (req.user.role === 'office_manager') {
      const teamIds = await User.find({ supervisedBy: req.user._id }).distinct('_id');
      leaveRequests = await LeaveRequest.find({
        status: LeaveStatus.PENDING_OFFICE_MANAGER,
        employee: { $in: teamIds },
      }).populate('employee', 'name email department').sort({ createdAt: -1 }).lean();
    } else if (req.user.role === 'manager') {
      const deptDoc = await Department.findById(req.user.department).catch(() => null)
        || await Department.findOne({ name: req.user.department }).catch(() => null);
      const deptValues = [req.user.department];
      if (deptDoc) {
        deptValues.push(deptDoc._id.toString());
        deptValues.push(deptDoc.name);
      }
      leaveRequests = await LeaveRequest.find({
        status: LeaveStatus.PENDING_MANAGER,
        department: { $in: deptValues },
        employee: { $ne: req.user._id },
      }).populate('employee', 'name email department').sort({ createdAt: -1 }).lean();
    } else if (req.user.role === 'admin' || req.user.role === 'hr') {
      leaveRequests = await LeaveRequest.find({
        status: { $in: [LeaveStatus.PENDING_OFFICE_MANAGER, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_GENERAL_MANAGER] },
      }).populate('employee', 'name email department').sort({ createdAt: -1 }).lean();
    } else {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    res.json({ success: true, data: { leaveRequests, count: leaveRequests.length } });
  } catch (error) {
    console.error('Error getting pending:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الطلبات المعلقة' });
  }
};

const getDepartmentLeaveCalendar = async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;
    if (req.user.role === 'manager' && req.user.department !== department)
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1));
    const leaves = await LeaveRequest.getDepartmentLeaveCalendar(department, start, end);
    res.json({ success: true, data: { leaves } });
  } catch (error) {
    console.error('Error getting calendar:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب التقويم' });
  }
};

const getLeaveRequests = async (req, res) => {
  try {
    const { status, employeeId, startDate, endDate, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (employeeId) {
      query.employee = employeeId;
    } else if (req.user.role === 'admin' || req.user.role === 'hr') {
      // admin/hr see all (used by LeaveManagement page)
    } else {
      // All other roles: own leaves only
      query.employee = req.user._id;
    }
    if (status) {
      if (status === 'pending') {
        query.status = { $in: ['pending', 'pending_office_manager', 'pending_manager', 'pending_general_manager'] };
      } else {
        query.status = status;
      }
    }
    if (type) query.type = type;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.endDate = { $lte: new Date(endDate) };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employee', 'name email department')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
    const total = await LeaveRequest.countDocuments(query);
    res.json({
      success: true, data: {
        requests: leaveRequests, count: leaveRequests.length,
        total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting leave requests:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب طلبات الإجازة' });
  }
};

const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'name email department');
    if (!leaveRequest) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (req.user.role === 'employee' && leaveRequest.employee._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    res.json({ success: true, data: { leaveRequest } });
  } catch (error) {
    console.error('Error getting leave request:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الطلب' });
  }
};

const validateLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;
    const errors = [];
    if (!type) errors.push('نوع الإجازة مطلوب');
    if (!startDate) errors.push('تاريخ البداية مطلوب');
    if (['annual', 'sick', 'exceptional', 'death', 'maternity', 'unpaid'].includes(type) && !endDate)
      errors.push('تاريخ النهاية مطلوب');
    if (errors.length > 0) return res.status(400).json({ success: false, message: errors.join('; '), errors });
    const balance = await LeaveRequest.checkLeaveBalance(req.user._id, type);
    res.json({ success: true, data: { valid: true, balance } });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في التحقق' });
  }
};

const requestStopLeave = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'name email department');
    if (!leaveRequest) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const isOwner = leaveRequest.employee._id.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'غير مصرح لك - فقط مالك الطلب يمكنه طلب إيقاف الإجازة' });

    if (!['approved', 'synced_to_payroll'].includes(leaveRequest.status))
      return res.status(400).json({ success: false, message: 'يمكن إيقاف الإجازات الموافق عليها فقط' });

    if (leaveRequest.stopRequested)
      return res.status(400).json({ success: false, message: 'تم طلب إيقاف هذه الإجازة مسبقاً. قم بالبصم على جهاز البصمة لإيقافها' });

    leaveRequest.stopRequested = true;
    leaveRequest.stopRequestedAt = new Date();
    await leaveRequest.save();

    // Notify manager
    try {
      const deptDoc = await Department.findById(leaveRequest.employee.department).catch(() => null)
        || await Department.findOne({ name: leaveRequest.employee.department }).catch(() => null);
      const deptValues = [leaveRequest.employee.department];
      if (deptDoc) {
        deptValues.push(deptDoc._id.toString());
        deptValues.push(deptDoc.name);
      }
      const manager = await User.findOne({ role: 'manager', department: { $in: deptValues }, isActive: true });
      if (manager && manager._id.toString() !== req.user._id.toString()) {
        const notif = await Notification.createNotification(
          manager._id, NotificationType.LEAVE_CANCELLED,
          'طلب إيقاف إجازة - بانتظار البصمة',
          `طلب ${leaveRequest.employee.name} إيقاف إجازته (${leaveLabel(leaveRequest.type)}). سيتم الإيقاف تلقائياً عند البصم على جهاز البصمة`,
          leaveRequest._id
        );
        emitSocket(manager._id, notif);
      }
    } catch (e) { console.error('notifyManagerOnStopRequest error:', e.message); }

    res.json({
      success: true,
      message: 'تم تسجيل طلب إيقاف الإجازة. قم بالبصم على جهاز البصمة لإيقاف الإجازة فعلياً',
      data: { leaveRequest }
    });
  } catch (error) {
    console.error('Error requesting stop leave:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في طلب إيقاف الإجازة' });
  }
};

async function processStopByFingerprint(employeeId, fingerprintDate) {
  try {
    if (!employeeId || !fingerprintDate) return;

    const dayStart = new Date(fingerprintDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Check attendance for this day
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: dayStart, $lt: dayEnd },
    });
    if (!attendance) return;

    // If only check-in exists, record it but don't stop leave yet
    if (attendance.checkIn?.time && !attendance.checkOut?.time) {
      await LeaveRequest.updateMany(
        {
          employee: employeeId,
          stopRequested: true,
          fingerprintStoppedAt: null,
          status: { $in: [LeaveStatus.APPROVED, 'synced_to_payroll'] },
          startDate: { $lte: dayEnd },
          endDate: { $gte: dayStart },
        },
        { $set: { checkInDetectedAt: attendance.checkIn.time } }
      );
      return;
    }

    // Must have BOTH check-in AND check-out to stop leave
    if (!attendance.checkIn?.time || !attendance.checkOut?.time) return;

    // Find stop-requested leaves covering this date
    const leaves = await LeaveRequest.find({
      employee: employeeId,
      stopRequested: true,
      fingerprintStoppedAt: null,
      status: { $in: [LeaveStatus.APPROVED, 'synced_to_payroll'] },
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart },
    });

    for (const leave of leaves) {
      // Shorten leave: endDate = day before fingerprintDate
      const newEnd = new Date(dayStart);
      newEnd.setDate(newEnd.getDate() - 1);

      if (newEnd < leave.startDate) {
        // Fingerprinted before or on start date → cancel entirely
        leave.status = LeaveStatus.CANCELLED;
        leave.fingerprintStoppedAt = dayStart;
        leave.days = 0;
      } else {
        leave.endDate = newEnd;
        leave.calculateDays();
        leave.fingerprintStoppedAt = dayStart;
      }

      await leave.save();

      // Delete on_leave attendance records for dates >= fingerprint date
      const deleteResult = await Attendance.deleteMany({
        employee: employeeId,
        leave: leave._id,
        status: 'on_leave',
        date: { $gte: dayStart },
      });

      console.log(`[processStopByFingerprint] Leave ${leave._id}: ${deleteResult.deletedCount} on_leave records deleted`);

      // Notify manager
      try {
        const employee = await User.findById(employeeId);
        const deptDoc = await Department.findById(employee.department).catch(() => null)
          || await Department.findOne({ name: employee.department }).catch(() => null);
        const deptValues = [employee.department];
        if (deptDoc) {
          deptValues.push(deptDoc._id.toString());
          deptValues.push(deptDoc.name);
        }
        const manager = await User.findOne({ role: 'manager', department: { $in: deptValues }, isActive: true });
        if (manager && manager._id.toString() !== employeeId.toString()) {
          const isCancelled = leave.status === LeaveStatus.CANCELLED;
          const notif = await Notification.createNotification(
            manager._id, NotificationType.LEAVE_CANCELLED,
            isCancelled ? 'تم إيقاف الإجازة بعد البصم' : 'تم تقصير الإجازة بعد البصم',
            isCancelled
              ? `تم إيقاف إجازة ${employee.name} (${leaveLabel(leave.type)}) بعد البصم على الجهاز`
              : `تم تقصير إجازة ${employee.name} (${leaveLabel(leave.type)}) إلى ${leave.days} أيام بعد البصم على الجهاز`,
            leave._id
          );
          emitSocket(manager._id, notif);
        }
      } catch (e) { console.error('notifyManagerOnStop error:', e.message); }
    }
  } catch (error) {
    console.error('[processStopByFingerprint] Error:', error.message);
  }
}

const deleteLeaveRequestPermanent = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee', 'name email department');
    if (!leaveRequest) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const empId = leaveRequest.employee?._id?.toString() || leaveRequest.employee?.toString();
    const userId = req.user._id.toString();
    const isOwner = empId === userId;

    if (!isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: `غير مصرح لك (${userId} vs ${empId})` });

    if (!isAdmin && isOwner && !['rejected', 'cancelled'].includes(leaveRequest.status))
      return res.status(400).json({ success: false, message: 'لا يمكن حذف هذا الطلب. يمكن حذف الطلبات المرفوضة أو الملغية فقط' });

    try {
      await Attendance.deleteMany({ leave: leaveRequest._id });
    } catch (e) { console.error('Error deleting attendance records:', e.message); }

    try {
      const PayrollItem = mongoose.model('PayrollItem');
      await PayrollItem.deleteMany({ sourceModel: 'LeaveRequest', sourceId: leaveRequest._id });
    } catch (e) { console.error('Error deleting payroll items:', e.message); }

    await LeaveRequest.deleteOne({ _id: leaveRequest._id });

    res.json({ success: true, message: 'تم حذف الإجازة من السجل نهائياً' });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في حذف الإجازة' });
  }
};

module.exports = {
  createLeaveRequest, validateLeaveRequest, getLeaveRequests, getLeaveRequestById,
  updateLeaveStatus: updateLeaveRequestStatus, cancelLeaveRequest,
  getLeaveBalance, getPendingLeaveRequests, getDepartmentLeaveCalendar,
  deleteLeaveRequestPermanent,
  requestStopLeave, processStopByFingerprint,
};
