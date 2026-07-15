/**
 * Task Routes
 * Task management endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  createTask,
  getMyTasks,
  getCreatedTasks,
  getTasksToEvaluate,
  getTasksToApprove,
  updateTaskStatus,
  evaluateTask,
  finalApproveTask,
  getTaskById,
  updateTask,
  deleteTask,
  getDailySummary,
  getWeeklySummary,
  getTaskReports,
  getTotalTasks,
  getProposals,
  approveProposal,
  rejectProposal,
  addEmployeeNotes,
  addManagerNote,
  approveDepartmentTask,
  rejectDepartmentTask,
  getDepartmentTasks
} = require('../controllers/taskController');
const { protect, managerOrAdmin, officeManagerOrAbove, adminOnly, adminOrHR } = require('../middleware/authMiddleware');

// POST /api/tasks - Create task
router.post('/', protect, createTask);

// GET /api/tasks/my-tasks - Get my tasks
router.get('/my-tasks', protect, getMyTasks);

// GET /api/tasks/created - Get tasks I created
router.get('/created', protect, getCreatedTasks);

// GET /api/tasks/to-evaluate - Get tasks to evaluate (manager or office manager)
router.get('/to-evaluate', protect, officeManagerOrAbove, getTasksToEvaluate);

// GET /api/tasks/to-approve - Get tasks to approve (admin or HR)
router.get('/to-approve', protect, adminOrHR, getTasksToApprove);

// GET /api/tasks/summary/daily - Get daily summary
router.get('/summary/daily', protect, getDailySummary);

// GET /api/tasks/summary/weekly - Get weekly summary
router.get('/summary/weekly', protect, getWeeklySummary);

// GET /api/tasks/reports - Get task reports (manager or office manager)
router.get('/reports', protect, officeManagerOrAbove, getTaskReports);

// GET /api/tasks/total - Get total tasks count (all time)
router.get('/total', protect, getTotalTasks);

// GET /api/tasks/proposals - Get pending proposals (manager or office manager)
router.get('/proposals', protect, officeManagerOrAbove, getProposals);

// GET /api/tasks/department - Get department tasks (manager or office manager)
router.get('/department', protect, officeManagerOrAbove, getDepartmentTasks);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', protect, getTaskById);

// PUT /api/tasks/:id - Update task
router.put('/:id', protect, updateTask);

// PUT /api/tasks/:id/status - Update task status
router.put('/:id/status', protect, updateTaskStatus);

// PUT /api/tasks/:id/notes - Add employee notes
router.put('/:id/notes', protect, addEmployeeNotes);

// PUT /api/tasks/:id/manager-note - Add manager note (manager/admin only)
router.put('/:id/manager-note', protect, managerOrAdmin, addManagerNote);

// POST /api/tasks/:id/evaluate - Evaluate task (manager)
router.post('/:id/evaluate', protect, managerOrAdmin, evaluateTask);

// POST /api/tasks/:id/final-approve - Final approve (admin)
router.post('/:id/final-approve', protect, adminOnly, finalApproveTask);

// POST /api/tasks/:id/approve-proposal - Approve a proposal (manager)
router.post('/:id/approve-proposal', protect, managerOrAdmin, approveProposal);

// POST /api/tasks/:id/reject-proposal - Reject a proposal (manager)
router.post('/:id/reject-proposal', protect, managerOrAdmin, rejectProposal);

// PUT /api/tasks/:id/department-approve - Department manager approves task
router.put('/:id/department-approve', protect, managerOrAdmin, approveDepartmentTask);

// PUT /api/tasks/:id/department-reject - Department manager rejects task
router.put('/:id/department-reject', protect, managerOrAdmin, rejectDepartmentTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', protect, deleteTask);

module.exports = router;