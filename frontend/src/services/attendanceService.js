import api from './api';

function buildQueryString(params) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  return queryParams.toString();
}

async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Attendance Service Error:', error?.response?.data || error.message);
    throw error;
  }
}

export const getAllAttendanceRecords = async (params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/attendance/history${qs ? `?${qs}` : ''}`));
};

export const getTodayAttendance = async () => {
  return handleApiCall(() => api.get('/attendance/today'));
};

export const checkIn = async (data = {}) => {
  return handleApiCall(() => api.post('/attendance/check-in', data));
};

export const checkOut = async (data = {}) => {
  return handleApiCall(() => api.post('/attendance/check-out', data));
};

export const getDepartmentAttendance = async (department, params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/attendance/department/${department}${qs ? `?${qs}` : ''}`));
};

export const updateAttendanceRecord = async (id, data) => {
  return handleApiCall(() => api.put(`/attendance/${id}`, data));
};

export const getLateReport = async (params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/attendance/reports/late${qs ? `?${qs}` : ''}`));
};

export const getWorkHoursReport = async (params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/attendance/reports/work-hours${qs ? `?${qs}` : ''}`));
};

export const getEmployeeAttendanceReport = async (employeeId, params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/attendance/reports/employee/${employeeId}${qs ? `?${qs}` : ''}`));
};

export const getWeeklyHours = async () => {
  return handleApiCall(() => api.get('/attendance/weekly-hours'));
};

export const getAttendanceDashboard = async () => {
  return handleApiCall(() => api.get('/attendance/dashboard'));
};

export const syncZKTecoDevice = async () => {
  return handleApiCall(() => api.post('/zkteco/sync', {}, { timeout: 180000 }));
};

export const testZKTecoConnection = async () => {
  return handleApiCall(() => api.get('/zkteco/test-connection'));
};

export const getZKTecoStatus = async () => {
  return handleApiCall(() => api.get('/zkteco/status'));
};

export const getDeviceUsersFromDevice = async () => {
  return handleApiCall(() => api.get('/zkteco/device-users'));
};

export const pullDeviceAttendance = async (startDate, endDate) => {
  const qs = buildQueryString({ startDate, endDate });
  return handleApiCall(() => api.get(`/zkteco/pull-attendance${qs ? `?${qs}` : ''}`));
};

export const getDeviceStatusMonitor = async () => {
  return handleApiCall(() => api.get('/zkteco/status-monitor'));
};

export const getRecentBiometricActivity = async () => {
  return handleApiCall(() => api.get('/zkteco/recent-activity'));
};

export const getErrorLogs = async (params = {}) => {
  const qs = buildQueryString(params);
  return handleApiCall(() => api.get(`/zkteco/error-logs${qs ? `?${qs}` : ''}`));
};

export const createErrorLog = async (data) => {
  return handleApiCall(() => api.post('/zkteco/error-logs', data));
};

export const resolveErrorLog = async (id, resolutionNote) => {
  return handleApiCall(() => api.put(`/zkteco/error-logs/${id}/resolve`, { resolutionNote }));
};

export const mapUserToDevice = async (userId, deviceUserId) => {
  return handleApiCall(() => api.post('/zkteco/map-user', { userId, deviceUserId }));
};

export const unmapUserFromDevice = async (userId) => {
  return handleApiCall(() => api.post('/zkteco/unmap-user', { userId }));
};

export const getUnmappedDeviceUsers = async (showAll = false) => {
  return handleApiCall(() => api.get(`/zkteco/unmapped-device-users?showAll=${showAll}`));
};

export const getSystemUsersForMapping = async (search = '') => {
  return handleApiCall(() => api.get(`/zkteco/system-users?search=${encodeURIComponent(search)}`));
};

export const getBiometricDashboardStats = async () => {
  return handleApiCall(() => api.get('/zkteco/dashboard-stats'));
};

export const getMappedUsersActivity = async (days = 7) => {
  return handleApiCall(() => api.get(`/zkteco/mapped-activity?days=${days}`));
};

export const bulkMapUsers = async (mappings) => {
  return handleApiCall(() => api.post('/zkteco/bulk-map-users', { mappings }));
};

export const cleanSyncDevice = async () => {
  return handleApiCall(() => api.post('/zkteco/clean-sync', {}, { timeout: 300000 }));
};

export const getMonthlyTimesheet = async (employeeId, month, year) => {
  return handleApiCall(() => api.get(`/attendance/timesheet/monthly/${employeeId}?month=${month}&year=${year}`));
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
