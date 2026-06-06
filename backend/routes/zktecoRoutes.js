const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  verifyBridge,
  receiveAttendance,
  getBridgeStatus,
  syncDeviceAttendance,
  testDeviceConnection,
  getDeviceUsers
} = require('../controllers/zktecoController');

router.post('/attendance', verifyBridge, receiveAttendance);
router.get('/status', getBridgeStatus);
router.post('/sync', protect, adminOnly, syncDeviceAttendance);
router.get('/test-connection', protect, adminOnly, testDeviceConnection);
router.get('/device-users', protect, adminOnly, getDeviceUsers);

module.exports = router;
