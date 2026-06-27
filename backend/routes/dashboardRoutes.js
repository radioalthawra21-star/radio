const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getEmployeePerformance, getDepartmentPerformance,
  getBottleneckStages, getAvgCompletionTime
} = require('../controllers/dashboardController');
const { protect, adminOrHR, managerOrAdmin } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/employee-performance', protect, getEmployeePerformance);
router.get('/department-performance', protect, getDepartmentPerformance);
router.get('/bottlenecks', protect, managerOrAdmin, getBottleneckStages);
router.get('/avg-completion-time', protect, getAvgCompletionTime);

module.exports = router;
