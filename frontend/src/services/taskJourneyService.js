import api from './api';

export const getTaskJourney = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/journey`);
  return res.data;
};

export const getTaskHistory = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/history`);
  return res.data;
};

export const getTaskCurrentState = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/current-state`);
  return res.data;
};

export const getTaskDuration = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/duration`);
  return res.data;
};

export const transferTask = async (taskId, data) => {
  const res = await api.put(`/tasks/${taskId}/transfer`, data);
  return res.data;
};
