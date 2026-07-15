const express = require('express');
const router = express.Router();
const { protect, adminOrHR, generalManagerOnly } = require('../middleware/authMiddleware');
const controller = require('../controllers/dailyReportController');

router.get('/manager', protect, controller.getManager);
router.get('/status', protect, controller.getStatus);
router.get('/today', protect, controller.getTodayReport);
router.post('/submit', protect, controller.submitReport);
router.get('/my-reports', protect, controller.getMyReports);

router.get('/admin/employee-reports/:userId', protect, adminOrHR, controller.getEmployeeReports);
router.get('/admin/export-employee-reports/:userId', protect, adminOrHR, controller.exportEmployeeReports);
router.get('/admin/today-summary', protect, adminOrHR, controller.getAdminTodaySummary);
router.get('/admin/report/:id', protect, adminOrHR, controller.getReportById);
router.delete('/admin/report/:id', protect, generalManagerOnly, controller.deleteReport);

module.exports = router;
