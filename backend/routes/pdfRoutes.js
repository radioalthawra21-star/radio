const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const pdfService = require('../services/pdfService');
const FinancialMisc = require('../models/FinancialMisc');
const Payroll = require('../models/Payroll');

router.get('/financial-misc', protect, async (req, res) => {
  try {
    const { month, type, archived, currency: cur, exchangeRate: rate } = req.query;
    const filter = { isActive: true };

    if (type && ['income', 'expense'].includes(type)) filter.type = type;
    if (archived === 'true') filter.archived = true;
    else if (archived === 'false' || !archived) filter.archived = { $ne: true };

    if (month) {
      const d = new Date(month + '-01');
      filter.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), 1),
        $lte: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      };
    }

    const items = await FinancialMisc.find(filter).sort('-date').lean();
    const incomeTotal = items
      .filter((i) => (i.type || i.meta?.type) === 'income')
      .reduce((s, i) => s + (i.amount || 0), 0);
    const expenseTotal = items
      .filter((i) => (i.type || i.meta?.type) === 'expense')
      .reduce((s, i) => s + (i.amount || 0), 0);

    const data = {
      items,
      incomeTotal,
      expenseTotal,
      netTotal: incomeTotal - expenseTotal,
      month: month || undefined,
      currency: cur || 'SYP',
      exchangeRate: rate ? Number(rate) : 25000,
    };

    const buffer = await pdfService.generatePDFBuffer(pdfService.generateFinancialMiscPDF, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="financial-misc-report.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء PDF', error: err.message });
  }
});

router.get('/payslip/:payrollId', protect, async (req, res) => {
  try {
    const { payrollId } = req.params;
    const payroll = await Payroll.findById(payrollId)
      .populate('employee', 'name username department email phone')
      .lean();

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'الراتب غير موجود' });
    }

    const isOwner = req.user.role === 'employee' && req.user._id.toString() === payroll.employee?._id?.toString();
    const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user.role) || isOwner;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
    }

    const allowances = Array.isArray(payroll.components?.allowances) ? payroll.components.allowances : [];
    const overtime = payroll.components?.overtime || { hours: 0, hourlyRate: 0, totalAmount: 0 };

    const payslipData = {
      payslipNumber: payroll.payslipNumber,
      payrollId: payroll._id,
      companyName: 'شركة إدارة الموارد البشرية',
      employeeName: payroll.employee?.name || 'غير معروف',
      employeeInfo: {
        name: payroll.employee?.name || 'غير معروف',
        department: payroll.employee?.department || 'غير محدد',
      },
      period: payroll.periodStart && payroll.periodEnd
        ? `${new Date(payroll.periodStart).toLocaleDateString('ar-SA')} - ${new Date(payroll.periodEnd).toLocaleDateString('ar-SA')}`
        : '',
      baseSalary: payroll.baseSalary || 0,
      breakdown: {
        allowances: allowances.reduce((s, a) => s + (a.amount || 0), 0),
        bonuses: Array.isArray(payroll.components?.bonuses) ? payroll.components.bonuses.reduce((s, b) => s + (b.amount || 0), 0) : 0,
        overtime: overtime.totalAmount || 0,
        deductions: payroll.totals?.deductions || 0,
      },
      totalDeductions: payroll.totals?.deductions || 0,
      totalSalary: payroll.totals?.gross || payroll.baseSalary || 0,
      netSalary: payroll.totals?.net || 0,
    };

    const buffer = await pdfService.generatePDFBuffer(pdfService.generatePayslipPDF, payslipData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payrollId}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('Payslip PDF error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء كشف المرتب', error: err.message });
  }
});

module.exports = router;
