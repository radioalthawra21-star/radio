import api from './api';

export const createWorkflowTask = async (data) => {
  const res = await api.post('/tasks/workflow', data);
  return res.data;
};

export const getKanbanBoard = async (params = {}) => {
  const res = await api.get('/tasks/kanban', { params });
  return res.data;
};

export const transitionTask = async (taskId, note = '') => {
  const res = await api.put(`/tasks/${taskId}/transition`, { note });
  return res.data;
};

export const approveStage = async (taskId, note = '') => {
  const res = await api.put(`/tasks/${taskId}/approve-stage`, { note });
  return res.data;
};

export const rejectStage = async (taskId, note = '') => {
  const res = await api.put(`/tasks/${taskId}/reject-stage`, { note });
  return res.data;
};

export const updateKanbanStatus = async (taskId, kanbanStatus) => {
  const res = await api.put(`/tasks/${taskId}/kanban-status`, { kanbanStatus });
  return res.data;
};

export const getTaskTimeline = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/timeline`);
  return res.data;
};

export const addComment = async (taskId, content) => {
  const res = await api.post(`/tasks/${taskId}/comments`, { content });
  return res.data;
};

export const getComments = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/comments`);
  return res.data;
};

export const uploadAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getAttachments = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/attachments`);
  return res.data;
};

export const deleteAttachment = async (taskId, attachId) => {
  const res = await api.delete(`/tasks/${taskId}/attachments/${attachId}`);
  return res.data;
};

export default {
  createWorkflowTask, getKanbanBoard, transitionTask,
  approveStage, rejectStage, updateKanbanStatus,
  getTaskTimeline, addComment, getComments,
  uploadAttachment, getAttachments, deleteAttachment
};
