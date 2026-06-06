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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadPayslipPDF = async (payrollId, payslipData) => {
  const id = payslipData?.payrollId || payrollId;
  if (id && String(id).length === 24) {
    const response = await api.get(`/pdf/payslip/${id}`, { responseType: 'blob' });
    downloadBlob(response.data, `payslip-${payslipData?.payslipNumber || id}.pdf`);
    return;
  }
  throw new Error('معرف المرتب غير صالح');
};

export default {
  getCurrentPayslip,
  exportPayslipPDF,
  downloadPayslipPDF,
};
