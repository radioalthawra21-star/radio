const express = require('express');
const router = express.Router();
const { getOffices, createOffice, updateOffice, deleteOffice, assignEmployeesToOffice, removeEmployeeFromOffice } = require('../controllers/officeController');
const { protect, managerOrAdmin, generalManagerOrHrManager } = require('../middleware/authMiddleware');

router.get('/', protect, getOffices);
router.post('/', protect, managerOrAdmin, createOffice);
router.post('/:id/assign-employees', protect, managerOrAdmin, assignEmployeesToOffice);
router.post('/:id/remove-employee', protect, managerOrAdmin, removeEmployeeFromOffice);
router.put('/:id', protect, generalManagerOrHrManager, updateOffice);
router.delete('/:id', protect, generalManagerOrHrManager, deleteOffice);

module.exports = router;
