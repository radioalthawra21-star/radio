const express = require('express');
const router = express.Router();
const { protect, adminOnly, managerOrAdmin } = require('../middleware/authMiddleware');
const { 
  getBonusesByEmployee, 
  getAllBonuses, 
  createBonus, 
  deleteBonus, 
  approveBonus 
} = require('../controllers/bonusController');

// Get all bonuses for employee
router.get('/employee/:employeeId', protect, getBonusesByEmployee);

// Give bonus to employee (manager/admin only)
router.post('/', protect, managerOrAdmin, createBonus);

// Get all bonuses (admin/manager)
router.get('/all', protect, managerOrAdmin, getAllBonuses);

// Delete bonus (admin/manager within 24h)
router.delete('/:id', protect, deleteBonus);

// Approve bonus (admin only)
router.put('/:id/approve', protect, adminOnly, approveBonus);

module.exports = router;