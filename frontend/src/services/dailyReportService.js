import api from './api';

export const getDailyReportStatus = async () => {
  const response = await api.get('/daily-report/status');
  return response.data;
};

export const getTodayReport = async () => {
  const response = await api.get('/daily-report/today');
  return response.data;
};

export const submitDailyReport = async (data) => {
  const response = await api.post('/daily-report/submit', data);
  return response.data;
};

export const getDepartmentManager = async () => {
  const response = await api.get('/daily-report/manager');
  return response.data;
};

export const getMyReports = async (page = 1, limit = 20) => {
  const response = await api.get('/daily-report/my-reports', { params: { page, limit } });
  return response.data;
};

export const getAdminTodaySummary = async () => {
  const response = await api.get('/daily-report/admin/today-summary');
  return response.data;
};

export const getReportById = async (id) => {
  const response = await api.get(`/daily-report/admin/report/${id}`);
  return response.data;
};

export const getEmployeeReports = async (userId, page = 1, limit = 50) => {
  const response = await api.get(`/daily-report/admin/employee-reports/${userId}`, { params: { page, limit } });
  return response.data;
};

export const deleteDailyReport = async (id) => {
  const response = await api.delete(`/daily-report/admin/report/${id}`);
  return response.data;
};

export const downloadEmployeeReports = async (userId, employeeName) => {
  const response = await api.get(`/daily-report/admin/export-employee-reports/${userId}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${employeeName}_التقارير_اليومية.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
