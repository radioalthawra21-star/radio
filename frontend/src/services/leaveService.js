import api from './api';

export const createLeaveRequest = async (data) => {
  const res = await api.post('/leave', data);
  return res.data;
};

export const getLeaveRequests = async (params = {}) => {
  const res = await api.get('/leave', { params });
  return res.data;
};

export const getLeaveRequestById = async (id) => {
  const res = await api.get(`/leave/${id}`);
  return res.data;
};

export const cancelLeaveRequest = async (id) => {
  const res = await api.delete(`/leave/${id}`);
  return res.data;
};

export const getLeaveBalance = async () => {
  const res = await api.get('/leave/balance');
  return res.data;
};

export const updateLeaveStatus = async (id, data) => {
  const res = await api.put(`/leave/${id}/status`, data);
  return res.data;
};

export const getPendingLeaveRequests = async () => {
  const res = await api.get('/leave/pending');
  return res.data;
};

// New: Real-time validation
export const validateLeaveRequest = async (data) => {
  const res = await api.post('/leave/validate', data);
  return res.data;
};

export default {
  createLeaveRequest, getLeaveRequests, getLeaveRequestById,
  cancelLeaveRequest, getLeaveBalance, updateLeaveStatus,
  getPendingLeaveRequests, validateLeaveRequest,
};