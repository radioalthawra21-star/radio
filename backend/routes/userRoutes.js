/**
 * User Routes
 * User management endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  getAllEmployees,
  getEmployeesByDepartment,
  getAllManagers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  calculatePerformanceScore,
  getRankings,
  getDepartmentStats,
  getPendingUsers,
  activateUser,
  getUserCounts,
  changePassword,
  getMyTeam,
  getOfficeManagersInDepartment,
  assignToOfficeManager,
  unassignFromOfficeManager,
  transferOfficeManager,
  getTeamAssignments
} = require('../controllers/userController');
const { protect, adminOnly, adminOrHR, profileViewerAccess, managerOrAdmin, officeManagerOrAbove } = require('../middleware/authMiddleware');
const { getEmployeeProfile, updateEmployeeProfile, uploadCV, deleteCV } = require('../controllers/employeeProfileController');
const cvUploadMiddleware = require('../middleware/cvUploadMiddleware');
const cvUpload = cvUploadMiddleware.upload;

// GET /api/users/employees - Get all employees
router.get('/employees', protect, getAllEmployees);

// GET /api/users - Get all users (for messaging)
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching all users...');
    const { User } = require('../models/User');
    const users = await User.find().select('-password').sort({ name: 1 });
    console.log('Found users:', users.length);
    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users: ' + error.message });
  }
});

// GET /api/users/department/:department - Get employees by department
router.get('/department/:department', protect, officeManagerOrAbove, getEmployeesByDepartment);

// GET /api/users/managers - Get all managers
router.get('/managers', protect, managerOrAdmin, getAllManagers);

// GET /api/users/rankings - Get employee rankings
router.get('/rankings', protect, adminOrHR, getRankings);

// GET /api/users/department-stats - Get department statistics
router.get('/department-stats', protect, managerOrAdmin, getDepartmentStats);

// GET /api/users/pending - Get pending users (admin or HR)
router.get('/pending', protect, adminOrHR, getPendingUsers);

// GET /api/users/counts - Get user counts (employees and managers)
router.get('/counts', protect, adminOrHR, getUserCounts);

// POST /api/users/:id/activate - Activate user (admin or HR)
router.post('/:id/activate', protect, adminOrHR, activateUser);

// Office Manager Routes (MUST be before /:id to avoid route shadowing)
// GET /api/users/my-team - Get team members for current office manager
router.get('/my-team', protect, officeManagerOrAbove, getMyTeam);

// GET /api/users/office-managers - Get office managers in department
router.get('/office-managers', protect, managerOrAdmin, getOfficeManagersInDepartment);

// GET /api/users/team-assignments - Get team assignments summary
router.get('/team-assignments', protect, managerOrAdmin, getTeamAssignments);

// POST /api/users/assign-to-office-manager - Assign employees to office manager
router.post('/assign-to-office-manager', protect, managerOrAdmin, assignToOfficeManager);

// DELETE /api/users/unassign-from-office-manager - Unassign employees
router.delete('/unassign-from-office-manager', protect, managerOrAdmin, unassignFromOfficeManager);

// PUT /api/users/transfer-office-manager - Transfer employees between office managers
router.put('/transfer-office-manager', protect, managerOrAdmin, transferOfficeManager);

// GET /api/users/:id - Get user by ID (admin/HR/manager only)
router.get('/:id', protect, managerOrAdmin, getUserById);

// POST /api/users - Create user (admin or manager)
router.post('/', protect, managerOrAdmin, createUser);

// PUT /api/users/change-password - Change password (authenticated user)
router.put('/change-password', protect, changePassword);

// PUT /api/users/:id - Update user (admin, HR, or department manager)
router.put('/:id', protect, managerOrAdmin, updateUser);

// DELETE /api/users/:id - Delete user (admin or HR)
router.delete('/:id', protect, adminOrHR, deleteUser);

// POST /api/users/:id/calculate-score - Calculate performance score
router.post('/:id/calculate-score', protect, managerOrAdmin, calculatePerformanceScore);

// Employee Profile Routes (Admin/HR only)
// GET /api/users/profile/:id - Get full employee profile
router.get('/profile/:id', protect, profileViewerAccess, getEmployeeProfile);

// PUT /api/users/profile/:id - Update employee profile
router.put('/profile/:id', protect, adminOrHR, updateEmployeeProfile);

// POST /api/users/profile/:id/cv - Upload employee CV
router.post('/profile/:id/cv', protect, adminOrHR, cvUpload.single('cv'), uploadCV);

// DELETE /api/users/profile/:id/cv - Delete employee CV
router.delete('/profile/:id/cv', protect, adminOrHR, deleteCV);

module.exports = router;