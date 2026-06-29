const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/dailyReportController');

router.get('/manager', protect, controller.getManager);
router.get('/status', protect, controller.getStatus);
router.get('/today', protect, controller.getTodayReport);
router.post('/submit', protect, controller.submitReport);
router.get('/my-reports', protect, controller.getMyReports);

module.exports = router;
