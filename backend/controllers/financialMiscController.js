const FinancialMisc = require('../models/FinancialMisc');

// Sanitize sort parameter to prevent NoSQL injection
const sanitizeSort = (sort) => {
  if (typeof sort !== 'string') return '-date';
  const allowed = ['date', '-date', 'amount', '-amount', 'type', '-type', 'number', '-number', 'createdAt', '-createdAt'];
  return allowed.includes(sort) ? sort : '-date';
};

// Whitelist of allowed fields for create/update
const ALLOWED_FIELDS = ['type', 'amount', 'description', 'date', 'category', 'notes', 'reference', 'month'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 500, sort = '-date', startDate, endDate, type, archived } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(500, Number(limit)));
    const filter = { isActive: true };
    if (type && ['income', 'expense'].includes(type)) filter.type = type;
    if (archived === 'true') filter.archived = true;
    else if (archived === 'false') filter.archived = false;
    else if (archived === undefined) filter.archived = { $ne: true };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const items = await FinancialMisc.find(filter)
      .sort(sanitizeSort(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username');
    const total = await FinancialMisc.countDocuments(filter);
    const totals = await FinancialMisc.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$type', 'expense'] },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    const incomeTotal = totals.find(t => t._id === 'income')?.total || 0;
    const expenseTotal = totals.find(t => t._id === 'expense')?.total || 0;
    res.json({
      success: true,
      data: {
        items, total, page: Number(page),
        incomeTotal, expenseTotal, netTotal: incomeTotal - expenseTotal
      }
    });
  } catch (error) {
    console.error('Error fetching financial records:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await FinancialMisc.findById(req.params.id)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username');
    if (!item) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching financial record:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

exports.create = async (req, res) => {
  try {
    const last = await FinancialMisc.findOne().sort({ number: -1 });
    // Only allow whitelisted fields + auto-generated fields
    const filteredData = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) filteredData[key] = req.body[key];
    }
    filteredData.number = (last?.number || 0) + 1;
    filteredData.createdBy = req.user._id;
    const item = await FinancialMisc.create(filteredData);
    res.status(201).json({ success: true, data: item, message: 'تمت الإضافة بنجاح' });
  } catch (error) {
    console.error('Error creating financial record:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await FinancialMisc.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'غير موجود' });
    // Only apply whitelisted fields
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    }
    item.updatedBy = req.user._id;
    await item.save();
    res.json({ success: true, data: item, message: 'تم التحديث بنجاح' });
  } catch (error) {
    console.error('Error updating financial record:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await FinancialMisc.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'غير موجود' });
    item.isActive = false;
    item.updatedBy = req.user._id;
    await item.save();
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('Error deleting financial record:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

exports.archiveMonth = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ success: false, message: 'يرجى تحديد الشهر' });
    const d = new Date(month);
    if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'تاريخ غير صالح' });
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const result = await FinancialMisc.updateMany(
      { isActive: true, archived: { $ne: true }, date: { $gte: start, $lte: end } },
      { $set: { archived: true, updatedBy: req.user._id } }
    );
    res.json({ success: true, message: `تم أرشفة ${result.modifiedCount} قيد` });
  } catch (error) {
    console.error('Error archiving month:', error.message);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};