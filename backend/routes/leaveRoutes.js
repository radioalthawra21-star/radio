/**
 * Leave Routes
 */
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  createLeaveRequest, validateLeaveRequest, getLeaveRequests, getLeaveRequestById,
  updateLeaveStatus, cancelLeaveRequest, getLeaveBalance, getPendingLeaveRequests, getDepartmentLeaveCalendar,
  deleteLeaveRequestPermanent, requestStopLeave,
} = require('../controllers/leaveController');
const { protect, managerOrAdmin, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, createLeaveRequest);
router.post('/upload-medical', protect, upload.single('medicalReport'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم رفع الملف' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url: fileUrl, filename: req.file.filename } });
});
router.post('/validate', protect, validateLeaveRequest);
router.get('/', protect, getLeaveRequests);
router.get('/balance', protect, getLeaveBalance);
router.get('/pending', protect, managerOrAdmin, getPendingLeaveRequests);
router.get('/:id', protect, getLeaveRequestById);
router.put('/:id/status', protect, managerOrAdmin, updateLeaveStatus);
router.delete('/:id/permanent', protect, deleteLeaveRequestPermanent);
router.post('/:id/request-stop', protect, requestStopLeave);
router.delete('/:id', protect, cancelLeaveRequest);
router.get('/calendar/:department', protect, managerOrAdmin, getDepartmentLeaveCalendar);

module.exports = router;