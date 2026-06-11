import api from './api';

export const getAllAttendanceRecords = async (params = {}) => {
  const { startDate, endDate, employeeId, department, page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (employeeId) queryParams.append('employeeId', employeeId);
  if (department) queryParams.append('department', department);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/attendance/history?${queryParams.toString()}`);
  return response.data;
};

export const getTodayAttendance = async () => {
  const response = await api.get('/attendance/today');
  return response.data;
};

export const checkIn = async (data = {}) => {
  const response = await api.post('/attendance/check-in', data);
  return response.data;
};

export const checkOut = async (data = {}) => {
  const response = await api.post('/attendance/check-out', data);
  return response.data;
};

export const getDepartmentAttendance = async (department, params = {}) => {
  const { startDate, endDate } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  const response = await api.get(`/attendance/department/${department}?${queryParams.toString()}`);
  return response.data;
};

export const updateAttendanceRecord = async (id, data) => {
  const response = await api.put(`/attendance/${id}`, data);
  return response.data;
};

export const getLateReport = async (params = {}) => {
  const { startDate, endDate, department, page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (department) queryParams.append('department', department);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/attendance/reports/late?${queryParams.toString()}`);
  return response.data;
};

export const getWorkHoursReport = async (params = {}) => {
  const { startDate, endDate, employeeId, department, page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (employeeId) queryParams.append('employeeId', employeeId);
  if (department) queryParams.append('department', department);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/attendance/reports/work-hours?${queryParams.toString()}`);
  return response.data;
};

export const getEmployeeAttendanceReport = async (employeeId, params = {}) => {
  const { startDate, endDate } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  const response = await api.get(`/attendance/reports/employee/${employeeId}?${queryParams.toString()}`);
  return response.data;
};

export const getWeeklyHours = async () => {
  const response = await api.get('/attendance/weekly-hours');
  return response.data;
};

export const getAttendanceDashboard = async () => {
  const response = await api.get('/attendance/dashboard');
  return response.data;
};

export const syncZKTecoDevice = async () => {
  const response = await api.post('/zkteco/sync', null, {
    timeout: 180000
  });
  return response.data;
};

export const testZKTecoConnection = async () => {
  const response = await api.get('/zkteco/test-connection');
  return response.data;
};

export const getZKTecoStatus = async () => {
  const response = await api.get('/zkteco/status');
  return response.data;
};

export const getDeviceUsersFromDevice = async () => {
  const response = await api.get('/zkteco/device-users');
  return response.data;
};

export const pullDeviceAttendance = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/zkteco/pull-attendance?${params.toString()}`);
  return response.data;
};

export const getDeviceStatusMonitor = async () => {
  const response = await api.get('/zkteco/status-monitor');
  return response.data;
};

export const getRecentBiometricActivity = async () => {
  const response = await api.get('/zkteco/recent-activity');
  return response.data;
};

export const getErrorLogs = async (params = {}) => {
  const { page = 1, limit = 20, resolved, errorType } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  if (resolved !== undefined) queryParams.append('resolved', resolved);
  if (errorType) queryParams.append('errorType', errorType);
  const response = await api.get(`/zkteco/error-logs?${queryParams.toString()}`);
  return response.data;
};

export const createErrorLog = async (data) => {
  const response = await api.post('/zkteco/error-logs', data);
  return response.data;
};

export const resolveErrorLog = async (id, resolutionNote) => {
  const response = await api.put(`/zkteco/error-logs/${id}/resolve`, { resolutionNote });
  return response.data;
};

export const mapUserToDevice = async (userId, deviceUserId) => {
  const response = await api.post('/zkteco/map-user', { userId, deviceUserId });
  return response.data;
};

export const unmapUserFromDevice = async (userId) => {
  const response = await api.post('/zkteco/unmap-user', { userId });
  return response.data;
};

export const getUnmappedDeviceUsers = async (showAll = false) => {
  const response = await api.get(`/zkteco/unmapped-device-users?showAll=${showAll}`);
  return response.data;
};

export const getSystemUsersForMapping = async (search = '') => {
  const response = await api.get(`/zkteco/system-users?search=${encodeURIComponent(search)}`);
  return response.data;
};

export const getBiometricDashboardStats = async () => {
  const response = await api.get('/zkteco/dashboard-stats');
  return response.data;
};

export const getMappedUsersActivity = async (days = 7) => {
  const response = await api.get(`/zkteco/mapped-activity?days=${days}`);
  return response.data;
};

export const bulkMapUsers = async (mappings) => {
  const response = await api.post('/zkteco/bulk-map-users', { mappings });
  return response.data;
};

export const cleanSyncDevice = async () => {
  const response = await api.post('/zkteco/clean-sync', {}, {
    timeout: 300000
  });
  return response.data;
};

export const getMonthlyTimesheet = async (employeeId, month, year) => {
  const response = await api.get(`/attendance/timesheet/monthly/${employeeId}?month=${month}&year=${year}`);
  return response.data;
};

export default {
  getAllAttendanceRecords,
  getTodayAttendance,
  checkIn,
  checkOut,
  getDepartmentAttendance,
  updateAttendanceRecord,
  getLateReport,
  getWorkHoursReport,
  getEmployeeAttendanceReport,
  getWeeklyHours,
  getAttendanceDashboard,
  syncZKTecoDevice,
  testZKTecoConnection,
  getZKTecoStatus,
  getDeviceUsersFromDevice,
  pullDeviceAttendance,
  getDeviceStatusMonitor,
  getRecentBiometricActivity,
  getErrorLogs,
  createErrorLog,
  resolveErrorLog,
  mapUserToDevice,
  unmapUserFromDevice,
  getUnmappedDeviceUsers,
  getSystemUsersForMapping,
  getBiometricDashboardStats,
  bulkMapUsers,
  getMappedUsersActivity,
  getMonthlyTimesheet,
  cleanSyncDevice
};
