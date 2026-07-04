import api from './api';

async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Payroll Service Error:', error?.response?.data || error.message);
    throw error;
  }
}

export const getEmployeePayroll = async (employeeId, params = {}) => {
  return handleApiCall(() => api.get(`/payroll/employee/${employeeId}`, { params }));
};

export const getAllPayrolls = async (params = {}) => {
  return handleApiCall(() => api.get('/payroll/all', { params }));
};

export const generatePayroll = async (payrollData) => {
  return handleApiCall(() => api.post('/payroll/generate', payrollData));
};

export const updatePayroll = async (payrollId, payrollData) => {
  return handleApiCall(() => api.put(`/payroll/${payrollId}`, payrollData));
};

export const approvePayroll = async (payrollId) => {
  return handleApiCall(() => api.put(`/payroll/${payrollId}/approve`));
};

export const markPayrollAsPaid = async (payrollId, paymentData) => {
  return handleApiCall(() => api.put(`/payroll/${payrollId}/pay`, paymentData));
};

export const deletePayroll = async (payrollId) => {
  return handleApiCall(() => api.delete(`/payroll/${payrollId}`));
};

export const getPayrollSummary = async (params = {}) => {
  return handleApiCall(() => api.get('/payroll/summary', { params }));
};

export const generatePayslip = async (payrollId) => {
  return handleApiCall(() => api.get(`/payroll/${payrollId}/payslip`));
};

export const getPendingPayrollAssignments = async (params = {}) => {
  return handleApiCall(() => api.get('/payroll/pending-assignments', { params }));
};

export const getRecentPayments = async () => {
  return handleApiCall(() => api.get('/payroll/recent'));
};

export const assignSalaryToPendingPayroll = async (payrollId, salaryData) => {
  return handleApiCall(() => api.put(`/payroll/${payrollId}/assign-salary`, salaryData));
};

export const getCurrentPayslip = async (period) => {
  const params = period ? { period } : {};
  return handleApiCall(() => api.get('/payroll/payslip/current', { params }));
};

export const exportPayslipPDF = async (payrollId) => {
  return handleApiCall(() => api.get(`/payroll/${payrollId}/payslip/export`));
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

// Combined fetch for payroll dashboard (reduces multiple sequential calls)
export const getPayrollDashboard = async (employeeId, period) => {
  try {
    const [payrollRes, summaryRes, payslipRes] = await Promise.allSettled([
      employeeId ? api.get(`/payroll/employee/${employeeId}`, { params: { period } }) : Promise.resolve(null),
      api.get('/payroll/summary', { params: period ? { period } : {} }),
      api.get('/payroll/payslip/current', { params: period ? { period } : {} })
    ]);

    return {
      success: true,
      data: {
        payroll: payrollRes.status === 'fulfilled' ? payrollRes.value?.data : null,
        summary: summaryRes.status === 'fulfilled' ? summaryRes.value?.data : null,
        payslip: payslipRes.status === 'fulfilled' ? payslipRes.value?.data : null
      }
    };
  } catch (error) {
    console.error('getPayrollDashboard error:', error);
    return { success: false, error: error.userMessage || 'Failed to load payroll dashboard', data: null };
  }
};

export default {
  getCurrentPayslip,
  exportPayslipPDF,
  downloadPayslipPDF,
  getPayrollDashboard,
  getAllPayrolls,
  getEmployeePayroll,
  generatePayroll,
  updatePayroll,
  approvePayroll,
  markPayrollAsPaid,
  deletePayroll,
  getPayrollSummary,
  generatePayslip,
  getPendingPayrollAssignments,
  getRecentPayments,
  assignSalaryToPendingPayroll
};
