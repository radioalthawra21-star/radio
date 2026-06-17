const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
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
  downloadEmployeeActivityExcel
} = require('../controllers/supervisorController');

router.get('/dashboard', protect, getSupervisorDashboard);
router.get('/raw-logs', protect, getRawLogs);
router.get('/manual-overrides', protect, getManualOverrides);
router.get('/final-attendance', protect, getFinalAttendance);
router.post('/manual-overrides', protect, createManualOverride);
router.delete('/manual-overrides/:id', protect, deleteManualOverride);
router.get('/device-users', protect, getDeviceUsersForSupervisor);
router.get('/stats', protect, getSupervisorStats);
router.get('/attendance-pdf', protect, downloadAttendancePDF);
router.get('/attendance-excel', protect, downloadAttendanceExcel);
router.get('/employee-activity-excel', protect, downloadEmployeeActivityExcel);

module.exports = router;
