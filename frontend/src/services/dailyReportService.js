import api from './api';

export const getDailyReportStatus = async (date) => {
  const params = date ? { date } : {};
  const response = await api.get('/daily-report/status', { params });
  return response.data;
};

export const getTodayReport = async (date) => {
  const params = date ? { date } : {};
  const response = await api.get('/daily-report/today', { params });
  return response.data;
};

export const submitDailyReport = async (data) => {
  const response = await api.post('/daily-report/submit', data);
  return response.data;
};

export const saveDailyReportDraft = async (data) => {
  const response = await api.post('/daily-report/submit', { ...data, status: 'draft' });
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

export const getReportsByDate = async (date, page = 1, limit = 50) => {
  const params = { page, limit };
  if (date) params.date = date;
  const response = await api.get('/daily-report/admin/reports-by-date', { params });
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
