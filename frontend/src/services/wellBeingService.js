import api from './api';

export const getWellBeingStatus = async () => {
  const response = await api.get('/well-being/status');
  return response.data;
};

export const submitWellBeingCheckIn = async (data) => {
  const response = await api.post('/well-being/submit', data);
  return response.data;
};

export const getWellBeingStats = async () => {
  const response = await api.get('/well-being/stats');
  return response.data;
};

export const getWellBeingTrends = async (days = 7) => {
  const response = await api.get('/well-being/trends', { params: { days } });
  return response.data;
};

export const getBurnoutRisk = async () => {
  const response = await api.get('/well-being/burnout-risk');
  return response.data;
};

export default {
  getWellBeingStatus,
  submitWellBeingCheckIn,
  getWellBeingStats,
  getWellBeingTrends,
  getBurnoutRisk
};