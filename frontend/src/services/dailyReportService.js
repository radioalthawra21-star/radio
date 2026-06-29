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
