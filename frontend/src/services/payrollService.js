import api from './api';

export const getEmployeePayroll = async (employeeId, params = {}) => {
  const response = await api.get(`/payroll/employee/${employeeId}`, { params });
  return response.data;
};

export const getAllPayrolls = async (params = {}) => {
  const response = await api.get('/payroll/all', { params });
  return response.data;
};

export const generatePayroll = async (payrollData) => {
  const response = await api.post('/payroll/generate', payrollData);
  return response.data;
};

export const updatePayroll = async (payrollId, payrollData) => {
  const response = await api.put(`/payroll/${payrollId}`, payrollData);
  return response.data;
};

export const approvePayroll = async (payrollId) => {
  const response = await api.put(`/payroll/${payrollId}/approve`);
  return response.data;
};

export const markPayrollAsPaid = async (payrollId, paymentData) => {
  const response = await api.put(`/payroll/${payrollId}/pay`, paymentData);
  return response.data;
};

export const deletePayroll = async (payrollId) => {
  const response = await api.delete(`/payroll/${payrollId}`);
  return response.data;
};

export const getPayrollSummary = async (params = {}) => {
  const response = await api.get('/payroll/summary', { params });
  return response.data;
};

export const generatePayslip = async (payrollId) => {
  const response = await api.get(`/payroll/${payrollId}/payslip`);
  return response.data;
};

export const getPendingPayrollAssignments = async (params = {}) => {
  const { page = 1, limit = 20 } = params;
  const response = await api.get(`/payroll/pending-assignments?page=${page}&limit=${limit}`);
  return response.data;
};

export const getRecentPayments = async () => {
  const response = await api.get('/payroll/recent');
  return response.data;
};

export const assignSalaryToPendingPayroll = async (payrollId, salaryData) => {
  const response = await api.put(`/payroll/${payrollId}/assign-salary`, salaryData);
  return response.data;
};

export const getCurrentPayslip = async (period) => {
  const params = period ? { period } : {};
  const response = await api.get('/payroll/payslip/current', { params });
  return response.data;
};

export const exportPayslipPDF = async (payrollId) => {
  const response = await api.get(`/payroll/${payrollId}/payslip/export`);
  return response.data;
};

export const downloadPayslipPDF = async (payrollId, payslipData) => {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF('p', 'mm', 'a4');
  const rtlText = (text, x, y, align = 'right') => {
    doc.text(text, x, y, { align, isInputRtl: true });
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  rtlText(payslipData.companyName || 'شركة إدارة الموارد البشرية', 190, 20, 'left');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  rtlText('كشف المرتب', 190, 30, 'left');
  rtlText('رقم الكشف: ' + (payslipData.payslipNumber || ''), 190, 36, 'left');

  // Employee info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  rtlText('بيانات الموظف', 190, 48, 'left');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rtlText('الاسم: ' + (payslipData.employeeName || payslipData.employeeInfo?.name || ''), 190, 55, 'left');
  rtlText('القسم: ' + (payslipData.employeeInfo?.department || ''), 190, 61, 'left');
  rtlText('الفترة: ' + (payslipData.period || ''), 190, 67, 'left');

  // Salary breakdown table
  const headers = [['البند', 'الوصف', 'المبلغ']];
  const rows = [];

  rows.push(['الراتب الأساسي', '', (payslipData.baseSalary || payslipData.payrollInfo?.baseSalary || 0).toFixed(2) + ' ريال']);

  const allowances = payslipData.breakdown?.allowances || payslipData.income?.allowances || [];
  allowances.forEach(a => rows.push(['علاوة', a.description || a.type || '', '+ ' + (a.amount || 0).toFixed(2) + ' ريال']));

  const bonuses = payslipData.breakdown?.bonuses || payslipData.income?.bonuses || [];
  bonuses.forEach(b => rows.push(['مكافأة', b.reason || b.type || '', '+ ' + (b.amount || 0).toFixed(2) + ' ريال']));

  const overtime = payslipData.breakdown?.overtime || payslipData.income?.overtime || {};
  if (overtime.hours > 0) {
    rows.push(['ساعات إضافية', overtime.hours + ' ساعة × ' + (overtime.hourlyRate || 0).toFixed(2), '+ ' + (overtime.totalAmount || 0).toFixed(2) + ' ريال']);
  }

  const absences = payslipData.breakdown?.absences || {};
  if (absences.days > 0) {
    rows.push(['خصم غياب', absences.days + ' يوم × ' + (absences.dailyRate || 0).toFixed(2), '- ' + (absences.totalAmount || 0).toFixed(2) + ' ريال']);
  }

  const totals = payslipData.totals || {};
  rows.push(['صافي الراتب', '', totals.net?.toFixed(2) + ' ريال']);
  rows.push(['الإجمالي', '', totals.gross?.toFixed(2) + ' ريال']);
  rows.push(['الخصومات', '', totals.deductions?.toFixed(2) + ' ريال']);

  doc.autoTable({
    head: headers,
    body: rows,
    startY: 75,
    styles: { font: 'helvetica', fontSize: 9, halign: 'right' },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Leave balances
  const leaveBalances = payslipData.leaveBalances || {};
  const sickBal = payslipData.sickLeaveBalance || {};
  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  rtlText('ملخص أرصدة الإجازات', 190, finalY, 'left');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rtlText('إجازة سنوية: ' + (leaveBalances.remainingBalance ?? '--') + ' يوم متبقي', 190, finalY + 7, 'left');
  rtlText('إجازة مرضية: ' + (sickBal.remainingBalance ?? '--') + ' يوم متبقي', 190, finalY + 13, 'left');

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  rtlText('تم إنشاء هذا الكشف تلقائياً بواسطة نظام إدارة الموارد البشرية', 190, 280, 'left');
  rtlText('توقيع رقمي: ' + (payslipData.digitalSignature || payslipData.payslipNumber || payslipData._id || '').slice(-16), 190, 285, 'left');

  doc.save('payslip-' + (payslipData.payslipNumber || payrollId || 'document') + '.pdf');
};

export default {
  getCurrentPayslip,
  exportPayslipPDF,
  downloadPayslipPDF,
};
