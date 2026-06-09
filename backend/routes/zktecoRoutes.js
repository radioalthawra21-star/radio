const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/zktecoController');

router.post('/attendance', verifyBridge, receiveAttendance);
router.get('/status', getBridgeStatus);
router.post('/sync', protect, syncDeviceAttendance);
router.get('/test-connection', protect, adminOnly, testDeviceConnection);
router.get('/device-users', protect, adminOnly, getDeviceUsers);
router.get('/pull-attendance', protect, adminOnly, pullDeviceAttendance);

router.get('/status-monitor', protect, adminOnly, getDeviceStatusMonitor);
router.get('/recent-activity', protect, getRecentBiometricActivity);
router.get('/error-logs', protect, adminOnly, getErrorLogs);
router.post('/error-logs', protect, adminOnly, createErrorLog);
router.put('/error-logs/:id/resolve', protect, adminOnly, resolveErrorLog);
router.post('/map-user', protect, adminOnly, mapUserToDevice);
router.post('/unmap-user', protect, adminOnly, unmapUserFromDevice);
router.get('/unmapped-device-users', protect, adminOnly, getUnmappedDeviceUsers);
router.get('/system-users', protect, adminOnly, getSystemUsersForMapping);
router.get('/dashboard-stats', protect, adminOnly, getBiometricDashboardStats);
router.post('/bulk-map-users', protect, adminOnly, bulkMapUsers);
router.get('/mapped-activity', protect, adminOnly, getMappedUsersActivity);

module.exports = router;
