const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');

const { protect, adminOrHR, adminOrHRorHrEmployee } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const holidays = await Holiday.find({ year }).sort({ startDate: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الإجازات' });
  }
});

router.post('/', protect, adminOrHRorHrEmployee, async (req, res) => {
  try {
    const { startDate, endDate, name, type } = req.body;
    if (!startDate || !name) {
      return res.status(400).json({ success: false, message: 'تاريخ البداية والاسم مطلوبان' });
    }
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start);
    end.setHours(23, 59, 59, 999);
    const year = start.getFullYear();
    const holiday = await Holiday.create({ name, startDate: start, endDate: end, type, year });
    res.json({ success: true, data: holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في إضافة الإجازة' });
  }
});

router.delete('/:id', protect, adminOrHR, async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'الإجازة غير موجودة' });
    }
    res.json({ success: true, message: 'تم حذف الإجازة' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في حذف الإجازة' });
  }
});

module.exports = router;
