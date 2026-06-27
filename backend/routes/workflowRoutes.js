const express = require('express');
const router = express.Router();
const {
  createWorkflow, getWorkflows, getWorkflowById,
  updateWorkflow, deleteWorkflow
} = require('../controllers/workflowController');
const { protect, adminOrHR, workflowAccess } = require('../middleware/authMiddleware');

router.post('/', protect, adminOrHR, createWorkflow);
router.get('/', protect, getWorkflows);
router.get('/:id', protect, getWorkflowById);
router.put('/:id', protect, adminOrHR, updateWorkflow);
router.delete('/:id', protect, adminOrHR, deleteWorkflow);

module.exports = router;
