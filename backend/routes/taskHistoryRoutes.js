const express = require('express');
const router = express.Router();
const {
  getTaskJourney,
  getTaskHistory,
  getTaskCurrentState,
  getTaskDuration,
  transferTask
} = require('../controllers/taskJourneyController');
const { protect, workflowAccess } = require('../middleware/authMiddleware');

router.get('/:id/journey', protect, workflowAccess, getTaskJourney);
router.get('/:id/history', protect, workflowAccess, getTaskHistory);
router.get('/:id/current-state', protect, workflowAccess, getTaskCurrentState);
router.get('/:id/duration', protect, workflowAccess, getTaskDuration);
router.put('/:id/transfer', protect, workflowAccess, transferTask);

module.exports = router;
