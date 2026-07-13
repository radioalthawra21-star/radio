/**
 * Attendance Controller
 * Handles employee attendance tracking
 */

const { Attendance, AttendanceStatus, CheckInStatus, CheckOutStatus } = require('../models/Attendance');
const { User } = require('../models/User');
const { LeaveRequest, LeaveStatus } = require('../models/LeaveRequest');
const { Settings } = require('../models/Settings');
const Holiday = require('../models/Holiday');

/**
 * Check in employee
 * POST /api/attendance/check-in
 */
const checkIn = async (req, res) => {
  try {
    const { location, notes } = req.body;
    const employeeId = req.user._id;
    
    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }
    
    // Check if employee is active
    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: 'حسابك غير نشط'
      });
    }
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'لقد قمت بالفعل بعملية تسجيل الحضور اليوم'
      });
    }
    
    // Fetch attendance settings
    const [workStartHour, workStartMinute, dailyWorkHours, lateGracePeriod, veryLateThreshold] = await Promise.all([
      Settings.getValue('workStartHour', 9),
      Settings.getValue('workStartMinute', 0),
      Settings.getValue('dailyWorkHours', 7),
      Settings.getValue('lateGracePeriodMinutes', 0),
      Settings.getValue('veryLateThresholdMinutes', 120),
    ]);

    // Create or update attendance
    let attendance;
    if (existingAttendance) {
      attendance = existingAttendance;
    } else {
      attendance = new Attendance({
        employee: employeeId,
        date: new Date(),
        department: employee.department,
        expectedHours: dailyWorkHours,
        status: AttendanceStatus.PRESENT
      });
    }
    
    // Perform check-in with settings
    attendance.checkInEmployee(new Date(), location, notes, {
      workStartHour,
      workStartMinute,
      lateGracePeriodMinutes: lateGracePeriod,
      veryLateThresholdMinutes: veryLateThreshold,
    });
    
    await attendance.save();
    
    res.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح',
      data: {
        attendance: {
          checkIn: attendance.checkIn,
          status: attendance.status,
          isLate: attendance.isLate
        }
      }
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check out employee
 * POST /api/attendance/check-out
 */
const checkOut = async (req, res) => {
  try {
    const { location, notes } = req.body;
    const employeeId = req.user._id;
    
    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }
    
    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم تسجيل الحضور لهذا اليوم'
      });
    }
    
    if (!attendance.checkIn || !attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'يجب تسجيل الحضور أولاً'
      });
    }
    
    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'لقد قمت بالفعل بعملية تسجيل المغادرة اليوم'
      });
    }
    
    // Fetch attendance settings
    const [workEndHour, workEndMinute, earlyLeaveGrace] = await Promise.all([
      Settings.getValue('workEndHour', 16),
      Settings.getValue('workEndMinute', 0),
      Settings.getValue('earlyLeaveGracePeriodMinutes', 0),
    ]);

    // Perform check-out with settings
    attendance.checkOutEmployee(new Date(), location, notes, {
      workEndHour,
      workEndMinute,
      earlyLeaveGracePeriodMinutes: earlyLeaveGrace,
    });
    
    await attendance.save();
    
    res.json({
      success: true,
      message: 'تم تسجيل المغادرة بنجاح',
      data: {
        attendance: {
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          duration: attendance.duration,
          overtime: attendance.overtime
        }
      }
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل المغادرة',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get today's attendance
 * GET /api/attendance/today
 */
const getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow }
    }).lean();
    
    if (!attendance) {
      return res.json({
        success: true,
        data: {
          attendance: null,
          message: 'لم يتم تسجيل الحضور لهذا اليوم'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        attendance
      }
    });
  } catch (error) {
    console.error('Error getting today attendance:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get attendance history
 * GET /api/attendance/history
 */
const getAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, status, employeeId, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';
    
    if (role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept)) {
      if (employeeId && typeof employeeId === 'string' && /^[0-9a-fA-F]{24}$/.test(employeeId)) query.employee = employeeId;
    } else if (role === 'manager') {
      if (employeeId && typeof employeeId === 'string' && /^[0-9a-fA-F]{24}$/.test(employeeId)) {
        query.employee = employeeId;
      } else {
        query.department = req.user.department;
      }
    } else {
      query.employee = req.user._id;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Validate status is a string, not an object (NoSQL injection prevention)
    const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'work_from_home'];
    if (status && typeof status === 'string' && validStatuses.includes(status)) {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const attendances = await Attendance.find(query)
      .populate('employee', 'name email department')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Attendance.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        records: attendances,
        count: attendances.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب سجل الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get attendance statistics
 * GET /api/attendance/stats
 */
const getAttendanceStats = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate, page = 1, limit = 365 } = req.query;
    
    const query = { employee: employeeId };
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;
    
    if (sDate || eDate) {
      query.date = {};
      if (sDate) query.date.$gte = sDate;
      if (eDate) query.date.$lte = eDate;
    }
    
    const totalRecords = await Attendance.countDocuments(query);
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const attendances = await Attendance.find(query).sort({ date: -1 }).skip(skip).limit(Math.min(parseInt(limit), 365)).lean();
    
    const Holiday = require('../models/Holiday');
    const holidays = await Holiday.find({
      startDate: { $lte: eDate || new Date(Date.now()) },
      endDate: { $gte: sDate || new Date(0) }
    }).select('startDate endDate').lean();
    let holidayCount = 0;
    const hStart = sDate || new Date(0);
    const hEnd = eDate || new Date(Date.now());
    for (const h of holidays) {
      const s = hStart > h.startDate ? hStart : h.startDate;
      const e = hEnd < h.endDate ? hEnd : h.endDate;
      if (s <= e) holidayCount += Math.floor((e - s) / 86400000) + 1;
    }
    
    const stats = {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === AttendanceStatus.PRESENT).length,
      absent: attendances.filter(a => a.status === AttendanceStatus.ABSENT).length,
      late: attendances.filter(a => a.status === AttendanceStatus.LATE).length,
      halfDay: attendances.filter(a => a.status === AttendanceStatus.HALF_DAY).length,
      onLeave: attendances.filter(a => a.status === AttendanceStatus.ON_LEAVE).length,
      workFromHome: attendances.filter(a => a.workFromHome).length,
      totalHours: attendances.reduce((sum, a) => sum + a.duration, 0) + holidayCount * 7,
      totalOvertime: attendances.reduce((sum, a) => sum + a.overtime, 0),
      averageHours: attendances.length > 0 
        ? attendances.reduce((sum, a) => sum + a.duration, 0) / attendances.length 
        : 0,
      lateRate: attendances.length > 0 
        ? (attendances.filter(a => a.status === AttendanceStatus.LATE).length / attendances.length * 100) 
        : 0
    };
    
    res.json({
      success: true,
      data: { stats, pagination: { total: totalRecords, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(totalRecords / parseInt(limit)) } }
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب إحصائيات الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get department attendance (admin/manager only)
 * GET /api/attendance/department/:department
 */
const getDepartmentAttendance = async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;
    
    // Check if user has access to this department
    const userDept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = userDept === 'hr' || userDept === 'human resources' || userDept === 'الموارد البشرية';
    if (req.user.role === 'manager' && !isHrDept && userDept !== department.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى أقسام أخرى'
      });
    }
    
    const query = { department };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const attendances = await Attendance.find(query)
      .populate('employee', 'name email')
      .sort({ date: -1 })
      .lean();
    
    const stats = await Attendance.getDepartmentStats(department, startDate, endDate);
    
    res.json({
      success: true,
      data: {
        attendances,
        stats
      }
    });
  } catch (error) {
    console.error('Error getting department attendance:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update attendance record (admin only)
 * PUT /api/attendance/:id
 */
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isApproved, notes, checkInTime, checkOutTime } = req.body;
    
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'سجل الحضور غير موجود'
      });
    }
    
    if (status) attendance.status = status;
    if (isApproved !== undefined) attendance.isApproved = isApproved;
    if (notes !== undefined) attendance.notes = notes;
    if (checkInTime) {
      attendance.checkIn = attendance.checkIn || {};
      attendance.checkIn.time = new Date(checkInTime);
    }
    if (checkOutTime) {
      attendance.checkOut = attendance.checkOut || {};
      attendance.checkOut.time = new Date(checkOutTime);
    }
    
    attendance.approvedBy = req.user._id;
    attendance.approvedAt = new Date();
    
    await attendance.save();
    
    res.json({
      success: true,
      message: 'تم تحديث سجل الحضور بنجاح',
      data: { attendance }
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تحديث سجل الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get late attendance report
 * GET /api/attendance/reports/late
 */
const getLateReport = async (req, res) => {
  try {
    const { startDate, endDate, department, page = 1, limit = 50 } = req.query;
    let query = { status: AttendanceStatus.LATE };

    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';

    if (role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept)) {
      if (department) query.department = department;
    } else if (role === 'manager') {
      query.department = req.user.department;
    } else {
      query.employee = req.user._id;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const records = await Attendance.find(query)
      .populate('employee', 'name email department jobTitle')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Attendance.countDocuments(query);
    const lateMinutes = records.reduce((sum, r) => {
      if (r.checkIn && r.checkIn.time) {
        const checkInTime = new Date(r.checkIn.time);
        const workStart = new Date(checkInTime);
        workStart.setHours(9, 0, 0, 0);
        if (checkInTime > workStart) {
          return sum + Math.round((checkInTime - workStart) / 60000);
        }
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        records,
        count: records.length,
        total,
        totalLateMinutes: lateMinutes,
        averageLateMinutes: records.length > 0 ? Math.round(lateMinutes / records.length) : 0,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting late report:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب تقرير التأخير',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get work hours report
 * GET /api/attendance/reports/work-hours
 */
const getWorkHoursReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department, page = 1, limit = 50 } = req.query;
    let query = {};

    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';

    if (role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept)) {
      if (employeeId) query.employee = employeeId;
      if (department) query.department = department;
    } else if (role === 'manager') {
      if (employeeId) {
        query.employee = employeeId;
      } else {
        query.department = req.user.department;
      }
    } else {
      query.employee = req.user._id;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const records = await Attendance.find(query)
      .populate('employee', 'name email department jobTitle')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Attendance.countDocuments(query);
    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
    const completedDays = records.filter(r => r.checkIn && r.checkIn.time && r.checkOut && r.checkOut.time).length;

    res.json({
      success: true,
      data: {
        records,
        count: records.length,
        total,
        statistics: {
          totalDays: records.length,
          completedDays,
          pendingCheckout: records.filter(r => r.checkIn && r.checkIn.time && (!r.checkOut || !r.checkOut.time)).length,
          totalHours: Math.round(totalHours * 100) / 100,
          totalOvertime: Math.round(totalOvertime * 100) / 100,
          averageHoursPerDay: records.length > 0 ? Math.round((totalHours / records.length) * 100) / 100 : 0,
          averageHoursPerCompletedDay: completedDays > 0 ? Math.round((totalHours / completedDays) * 100) / 100 : 0
        },
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting work hours report:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب تقرير ساعات العمل',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get employee attendance report (detailed)
 * GET /api/attendance/reports/employee/:employeeId
 */
const getEmployeeAttendanceReport = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';
    const isAdmin = role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept);
    const isSelf = req.user._id.toString() === employeeId;
    const isManagerOfDept = role === 'manager' && req.user.department;

    if (!isAdmin && !isSelf && !isManagerOfDept) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا التقرير'
      });
    }

    const employee = await User.findById(employeeId).select('-password');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    let query = { employee: employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query).sort({ date: -1 }).lean();
    const totalDays = records.length;
    const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const late = records.filter(r => r.status === AttendanceStatus.LATE).length;
    const halfDay = records.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
    const onLeave = records.filter(r => r.status === AttendanceStatus.ON_LEAVE).length;

    const Holiday = require('../models/Holiday');
    const holidays = await Holiday.find({
      startDate: { $lte: new Date(endDate || Date.now()) },
      endDate: { $gte: new Date(startDate || 0) }
    }).select('startDate endDate').lean();
    let holidayCount = 0;
    const hStart = new Date(startDate || 0);
    const hEnd = new Date(endDate || Date.now());
    for (const h of holidays) {
      const s = Math.max(hStart, h.startDate);
      const e = Math.min(hEnd, h.endDate);
      if (s <= e) holidayCount += Math.floor((e - s) / 86400000) + 1;
    }

    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0) + holidayCount * 7;
    const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
    const lateMinutes = records.reduce((sum, r) => {
      if (r.checkIn && r.checkIn.time && r.status === AttendanceStatus.LATE) {
        const checkInTime = new Date(r.checkIn.time);
        const workStart = new Date(checkInTime);
        workStart.setHours(9, 0, 0, 0);
        if (checkInTime > workStart) {
          return sum + Math.round((checkInTime - workStart) / 60000);
        }
      }
      return sum;
    }, 0);

    const daysWithCheckOut = records.filter(r => r.checkOut && r.checkOut.time).length;

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          jobTitle: employee.jobTitle
        },
        reportPeriod: { startDate: startDate || null, endDate: endDate || null },
        summary: {
          totalDays,
          present,
          absent,
          late,
          halfDay,
          onLeave,
          totalHours: Math.round(totalHours * 100) / 100,
          totalOvertime: Math.round(totalOvertime * 100) / 100,
          averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
          attendanceRate: totalDays > 0 ? Math.round(((present + halfDay) / totalDays) * 100) : 0,
          lateRate: totalDays > 0 ? Math.round((late / totalDays) * 100) : 0,
          totalLateMinutes: lateMinutes,
          averageLateMinutes: late > 0 ? Math.round(lateMinutes / late) : 0,
          daysWithCheckOut
        },
        records
      }
    });
  } catch (error) {
    console.error('Error getting employee attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب تقرير حضور الموظف',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get attendance dashboard statistics
 * GET /api/attendance/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';
    const isAdminOrHr = role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    let todayQuery = {};
    let monthlyQuery = { date: { $gte: startOfMonth, $lt: tomorrow } };
    let weeklyQuery = { date: { $gte: startOfWeek, $lt: tomorrow } };

    if (!isAdminOrHr) {
      todayQuery.employee = req.user._id;
      monthlyQuery.employee = req.user._id;
      weeklyQuery.employee = req.user._id;
    } else if (role === 'manager') {
      todayQuery.department = req.user.department;
      monthlyQuery.department = req.user.department;
      weeklyQuery.department = req.user.department;
    }

    todayQuery.date = { $gte: today, $lt: tomorrow };

    const [todayRecords, monthlyRecords, weeklyRecords, totalEmployees] = await Promise.all([
      Attendance.find(todayQuery).populate('employee', 'name department jobTitle').lean(),
      Attendance.find(monthlyQuery).populate('employee', 'name department jobTitle').lean(),
      Attendance.find(weeklyQuery).populate('employee', 'name department jobTitle').lean(),
      isAdminOrHr ? User.countDocuments({ isActive: true }) : Promise.resolve(null)
    ]);

    const computeStats = (records) => {
      const total = records.length;
      const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
      const late = records.filter(r => r.status === AttendanceStatus.LATE).length;
      const halfDay = records.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
      const onLeave = records.filter(r => r.status === AttendanceStatus.ON_LEAVE).length;
      const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0);
      const checkedIn = records.filter(r => r.checkIn && r.checkIn.time && (!r.checkOut || !r.checkOut.time)).length;
      const completed = records.filter(r => r.checkIn && r.checkIn.time && r.checkOut && r.checkOut.time).length;
      return {
        total, present, absent, late, halfDay, onLeave,
        totalHours: Math.round(totalHours * 100) / 100,
        checkedIn, completed,
        attendanceRate: total > 0 ? Math.round(((present + halfDay) / total) * 100) : 0
      };
    };

    const [workStartHour, workStartMinute, workEndHour, workEndMinute, dailyWorkHours, lateGracePeriod, earlyLeaveGrace, veryLateThreshold] = await Promise.all([
      Settings.getValue('workStartHour', 9),
      Settings.getValue('workStartMinute', 0),
      Settings.getValue('workEndHour', 16),
      Settings.getValue('workEndMinute', 0),
      Settings.getValue('dailyWorkHours', 7),
      Settings.getValue('lateGracePeriodMinutes', 0),
      Settings.getValue('earlyLeaveGracePeriodMinutes', 0),
      Settings.getValue('veryLateThresholdMinutes', 120),
    ]);

    res.json({
      success: true,
      data: {
        today: computeStats(todayRecords),
        weekly: computeStats(weeklyRecords),
        monthly: computeStats(monthlyRecords),
        totalEmployees,
        todayRecords,
        timestamp: new Date().toISOString(),
        settings: {
          workStartHour,
          workStartMinute,
          workEndHour,
          workEndMinute,
          dailyWorkHours,
          lateGracePeriodMinutes: lateGracePeriod,
          earlyLeaveGracePeriodMinutes: earlyLeaveGrace,
          veryLateThresholdMinutes: veryLateThreshold,
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب إحصائيات لوحة الحضور',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getWeeklyHours = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      employee: employeeId,
      date: { $gte: sunday, $lte: saturday },
      status: { $in: ['present', 'late', 'work_from_home'] },
    }).lean();

    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
    const workDays = records.length;
    const expectedHours = workDays * 8;

    res.json({
      success: true,
      data: {
        weekStart: sunday,
        weekEnd: saturday,
        totalHours: Math.round(totalHours * 100) / 100,
        totalOvertime: Math.round(totalOvertime * 100) / 100,
        workDays,
        expectedHours,
        remainingHours: Math.max(0, Math.round((expectedHours - totalHours) * 100) / 100),
      },
    });
  } catch (error) {
    console.error('Error getting weekly hours:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حساب ساعات العمل الأسبوعية',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get monthly timesheet for an employee (read-only biometric attendance report)
 * GET /api/attendance/timesheet/monthly/:employeeId?month=M&year=Y
 */
const getMonthlyTimesheet = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';
    const isAdmin = role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept);
    const isSelf = req.user._id.toString() === employeeId;
    const isManagerOfDept = role === 'manager' && req.user.department;

    if (!isAdmin && !isSelf && !isManagerOfDept) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا التقرير'
      });
    }

    const employee = await User.findById(employeeId).select('name email department jobTitle');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const holidays = await Holiday.find({
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart }
    }).lean();

    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: { $in: ['approved', 'synced_to_payroll'] },
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart }
    }).lean();

    const records = await Attendance.find({
      employee: employeeId,
      date: { $gte: monthStart, $lte: monthEnd }
    }).sort({ date: 1, 'checkIn.time': 1 }).lean();

    const recordsByDate = {};
    for (const r of records) {
      const groupTime = r.checkIn && r.checkIn.time ? r.checkIn.time : r.date;
      const d = new Date(groupTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!recordsByDate[key]) recordsByDate[key] = [];
      recordsByDate[key].push(r);
    }

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const daily = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = recordsByDate[key] || [];
      const dayOfWeek = date.getDay();

      const isFriday = dayOfWeek === 5;
      const isNotYet = key >= todayKey;

      const holidayMatch = holidays.find(h => {
        const s = new Date(h.startDate);
        const e = new Date(h.endDate);
        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        return date >= s && date <= e;
      });
      const holidayName = holidayMatch ? holidayMatch.name : null;

      const leaveMatch = approvedLeaves.find(l => {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        return date >= s && date <= e;
      });

      let entry = {
        date: key,
        dayName: dayNames[dayOfWeek],
        dayOfWeek,
        isWeekend: isFriday,
        isFuture: isNotYet,
        isHoliday: !!holidayName,
        holidayName,
        isOnLeave: !!leaveMatch,
        leaveType: leaveMatch ? leaveMatch.type : null,
        firstCheckIn: null,
        lastCheckOut: null,
        totalWorkedHours: 0,
        attendanceStatus: null,
        hasRecord: false
      };

      if (holidayName) {
        entry.attendanceStatus = 'holiday';
      } else if (leaveMatch) {
        entry.attendanceStatus = 'on_leave';
      } else if (dayRecords.length === 0 && !isFriday && !isNotYet) {
        entry.attendanceStatus = 'absent';
      }

      if (dayRecords.length > 0) {
        dayRecords.sort((a, b) => {
          const aTime = a.checkIn && a.checkIn.time ? new Date(a.checkIn.time).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.checkIn && b.checkIn.time ? new Date(b.checkIn.time).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });

        const firstRecord = dayRecords[0];
        const lastRecord = dayRecords[dayRecords.length - 1];

        entry.hasRecord = true;
        entry.recordId = lastRecord._id;
        entry.firstRecordId = firstRecord._id;
        entry.firstCheckIn = firstRecord.checkIn && firstRecord.checkIn.time ? firstRecord.checkIn.time : null;

        if (lastRecord.checkOut && lastRecord.checkOut.time) {
          entry.lastCheckOut = lastRecord.checkOut.time;
        } else if (dayRecords.length > 1) {
          for (let i = dayRecords.length - 1; i >= 0; i--) {
            if (dayRecords[i].checkOut && dayRecords[i].checkOut.time) {
              entry.lastCheckOut = dayRecords[i].checkOut.time;
              break;
            }
          }
        }

        entry.totalWorkedHours = lastRecord.duration || 0;
        entry.attendanceStatus = lastRecord.status;
        entry.checkInStatus = firstRecord.checkIn ? firstRecord.checkIn.status : null;
        entry.checkOutStatus = lastRecord.checkOut ? lastRecord.checkOut.status : null;
        entry.overtime = lastRecord.overtime || 0;
        entry.expectedHours = lastRecord.expectedHours || 8;
        entry.isLate = false;
        entry.lateHours = 0;
        entry.isEarlyDeparture = false;
        entry.earlyDepartureMinutes = 0;

        if (entry.firstCheckIn && (!leaveMatch || leaveMatch.type !== 'hourly')) {
          const checkInDate = new Date(entry.firstCheckIn);
          const checkInMin = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();
          const workStartMin = 6 * 60; // 06:00 UTC = 09:00 Saudi
          const diffMin = checkInMin - workStartMin;
          if (diffMin > 10) {
            entry.lateHours = Math.round(diffMin / 60 * 100) / 100;
            entry.isLate = true;
            if (entry.attendanceStatus !== 'holiday' && entry.attendanceStatus !== 'on_leave') {
              entry.attendanceStatus = 'late';
            }
          }
        }

        entry.overtimeMinutes = 0;

        if (entry.lastCheckOut) {
          const checkOutDate = new Date(entry.lastCheckOut);
          const checkOutMin = checkOutDate.getUTCHours() * 60 + checkOutDate.getUTCMinutes();
          const workEndMin = 13 * 60; // 13:00 UTC = 16:00 Saudi

          const earlyMin = workEndMin - checkOutMin;
          if (earlyMin > 0) {
            entry.earlyDepartureMinutes = earlyMin;
            entry.isEarlyDeparture = true;
          }

          const overtimeMin = checkOutMin - workEndMin;
          if (overtimeMin > 0) {
            entry.overtimeMinutes = overtimeMin;
          }
        }
      }

      daily.push(entry);
    }

    const presentDays = daily.filter(d => d.attendanceStatus === 'present');
    const lateByStatus = daily.filter(d => d.attendanceStatus === 'late');
    const lateDays = daily.filter(d => d.isLate);
    const lateHoursSum = Math.round(lateDays.reduce((sum, d) => sum + (d.lateHours || 0), 0) * 100) / 100;
    const earlyDepartureDays = daily.filter(d => d.isEarlyDeparture);
    const earlyDepartureMinutesSum = earlyDepartureDays.reduce((sum, d) => sum + (d.earlyDepartureMinutes || 0), 0);
    const overtimeDays = daily.filter(d => d.overtimeMinutes > 0);
    const overtimeMinutesSum = overtimeDays.reduce((sum, d) => sum + (d.overtimeMinutes || 0), 0);
    const halfDays = [];
    const absentDays = daily.filter(d => d.attendanceStatus === 'absent');
    const onLeaveDays = daily.filter(d => d.attendanceStatus === 'on_leave');
    const holidayDays = daily.filter(d => d.attendanceStatus === 'holiday');
    const incompleteDays = daily.filter(d => d.hasRecord && (!d.firstCheckIn || !d.lastCheckOut));

    const totalWorkingDays = daily.filter(d => !d.isWeekend && !d.isFuture && !d.isHoliday && !d.isOnLeave).length;

    const summary = {
      totalDaysInMonth: daysInMonth,
      totalWorkingDays,
      totalAttendanceDays: presentDays.length + lateByStatus.length + halfDays.length,
      totalPresentDays: presentDays.length,
      totalLateDays: lateDays.length,
      totalLateHours: lateHoursSum,
      totalHalfDays: halfDays.length,
      totalAbsenceDays: absentDays.length,
      totalOnLeaveDays: onLeaveDays.length,
      totalHolidays: holidayDays.length,
      totalEarlyDepartures: earlyDepartureDays.length,
      totalEarlyDepartureMinutes: earlyDepartureMinutesSum,
      totalIncompleteDays: incompleteDays.length,
      totalOvertimeMinutes: overtimeMinutesSum,
      totalWorkedHours: Math.round(daily.reduce((sum, d) => sum + (d.totalWorkedHours || 0), 0) * 100) / 100,
      noRecordDays: daily.filter(d => !d.hasRecord && !d.isWeekend && !d.isHoliday && !d.isOnLeave).length
    };

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          jobTitle: employee.jobTitle
        },
        period: { month, year, monthStart, monthEnd },
        summary,
        daily
      }
    });
  } catch (error) {
    console.error('Error generating monthly timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء كشف الحضور الشهري',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStats,
  getDepartmentAttendance,
  updateAttendance,
  getLateReport,
  getWorkHoursReport,
  getEmployeeAttendanceReport,
  getDashboardStats,
  getWeeklyHours,
  getMonthlyTimesheet,
};
