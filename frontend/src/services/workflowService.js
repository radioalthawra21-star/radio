import api from './api';

export const createWorkflow = async (data) => {
  const res = await api.post('/workflows', data);
  return res.data;
};

export const getWorkflows = async (params = {}) => {
  const res = await api.get('/workflows', { params });
  return res.data;
};

export const getWorkflowById = async (id) => {
  const res = await api.get(`/workflows/${id}`);
  return res.data;
};

export const updateWorkflow = async (id, data) => {
  const res = await api.put(`/workflows/${id}`, data);
  return res.data;
};

export const deleteWorkflow = async (id) => {
  const res = await api.delete(`/workflows/${id}`);
  return res.data;
};

export default {
  createWorkflow, getWorkflows, getWorkflowById,
  updateWorkflow, deleteWorkflow
};
