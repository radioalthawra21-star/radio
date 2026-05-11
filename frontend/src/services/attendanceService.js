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

export default {
  getAllAttendanceRecords,
  getTodayAttendance,
  checkIn,
  checkOut,
  getDepartmentAttendance
};
