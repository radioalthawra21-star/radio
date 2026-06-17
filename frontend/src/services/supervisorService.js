import api from './api';

export const getSupervisorDashboard = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/supervisor/dashboard?${params.toString()}`);
  return response.data;
};

export const getRawLogs = async (params = {}) => {
  const { startDate, endDate, deviceUserId, limit = 500 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (deviceUserId) queryParams.append('deviceUserId', deviceUserId);
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/supervisor/raw-logs?${queryParams.toString()}`);
  return response.data;
};

export const getManualOverrides = async (params = {}) => {
  const { startDate, endDate, deviceUserId, action, limit = 500 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (deviceUserId) queryParams.append('deviceUserId', deviceUserId);
  if (action) queryParams.append('action', action);
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/supervisor/manual-overrides?${queryParams.toString()}`);
  return response.data;
};

export const getFinalAttendance = async (params = {}) => {
  const { startDate, endDate, employeeId, department, status, limit = 500 } = params;
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (employeeId) queryParams.append('employeeId', employeeId);
  if (department) queryParams.append('department', department);
  if (status) queryParams.append('status', status);
  if (limit) queryParams.append('limit', limit.toString());
  const response = await api.get(`/supervisor/final-attendance?${queryParams.toString()}`);
  return response.data;
};

export const createManualOverride = async (data) => {
  const response = await api.post('/supervisor/manual-overrides', data);
  return response.data;
};

export const deleteManualOverride = async (id) => {
  const response = await api.delete(`/supervisor/manual-overrides/${id}`);
  return response.data;
};

export const getDeviceUsersForSupervisor = async () => {
  const response = await api.get('/supervisor/device-users');
  return response.data;
};

export const getSupervisorStats = async () => {
  const response = await api.get('/supervisor/stats');
  return response.data;
};

export const relinkDeviceLogs = async () => {
  const response = await api.post('/zkteco/relink-device-logs', {}, { timeout: 120000 });
  return response.data;
};

export const syncDeviceNow = async () => {
  const response = await api.post('/zkteco/sync', {}, { timeout: 180000 });
  return response.data;
};

export const downloadAttendancePdf = async (employeeId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employeeId', employeeId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/supervisor/attendance-pdf?${params.toString()}`, {
    responseType: 'blob',
    timeout: 60000
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance-${employeeId || 'all'}-${startDate}-${endDate}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadEmployeeActivityExcel = async (employeeId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employeeId', employeeId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/supervisor/employee-activity-excel?${params.toString()}`, {
    responseType: 'blob',
    timeout: 60000
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `نشاط_موظف_${startDate || ''}_${endDate || ''}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getEmployeeActivity = async (employeeId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employeeId', employeeId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/supervisor/employee-activity?${params.toString()}`);
  return response.data;
};

export const downloadAttendanceExcel = async (employeeId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employeeId', employeeId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/supervisor/attendance-excel?${params.toString()}`, {
    responseType: 'blob',
    timeout: 60000
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance-${employeeId || 'all'}-${startDate || ''}-${endDate || ''}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
