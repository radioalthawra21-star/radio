const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/attendanceController');
const { protect, managerOrAdmin, adminOnly } = require('../middleware/authMiddleware');

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/today', protect, getTodayAttendance);
router.get('/history', protect, getAttendanceHistory);
router.get('/stats', protect, getAttendanceStats);
router.get('/weekly-hours', protect, getWeeklyHours);

router.get('/dashboard', protect, getDashboardStats);

router.get('/reports/late', protect, getLateReport);
router.get('/reports/work-hours', protect, getWorkHoursReport);
router.get('/reports/employee/:employeeId', protect, getEmployeeAttendanceReport);
router.get('/timesheet/monthly/:employeeId', protect, getMonthlyTimesheet);

router.get('/department/:department', protect, managerOrAdmin, getDepartmentAttendance);

const hrAndAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  const dept = req.user?.department?.toLowerCase() || '';
  const isHrDept = dept === 'hr' || dept === 'human resources' || dept === 'الموارد البشرية';
  if (role === 'admin' || role === 'hr' || (role === 'manager' && isHrDept)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه الصفحة'
    });
  }
};
router.put('/:id', protect, hrAndAdmin, updateAttendance);

module.exports = router;
