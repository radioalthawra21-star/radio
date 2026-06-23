const express = require('express');
const router = express.Router();
const { protect, adminOrHR, adminOrHRorHrEmployee } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/supervisorController');

router.get('/dashboard', protect, adminOrHR, getSupervisorDashboard);
router.get('/raw-logs', protect, adminOrHR, getRawLogs);
router.get('/manual-overrides', protect, adminOrHR, getManualOverrides);
router.get('/final-attendance', protect, adminOrHR, getFinalAttendance);
router.post('/manual-overrides', protect, adminOrHR, createManualOverride);
router.delete('/manual-overrides/:id', protect, adminOrHR, deleteManualOverride);
router.get('/device-users', protect, adminOrHRorHrEmployee, getDeviceUsersForSupervisor);
router.get('/stats', protect, adminOrHR, getSupervisorStats);
router.get('/attendance-pdf', protect, adminOrHR, downloadAttendancePDF);
router.get('/attendance-excel', protect, adminOrHR, downloadAttendanceExcel);
router.get('/employee-activity-excel', protect, adminOrHRorHrEmployee, downloadEmployeeActivityExcel);
router.get('/all-employees-activity-excel', protect, adminOrHRorHrEmployee, downloadAllEmployeesActivityExcel);
router.get('/employee-activity', protect, adminOrHRorHrEmployee, getEmployeeActivity);

module.exports = router;
