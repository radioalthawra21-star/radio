/**
 * Task Service
 * Handles all task-related API calls
 */

import api from './api';

// Create new task
export const createTask = async (taskData) => {
  const response = await api.post('/tasks', taskData);
  return response.data;
};

// Get my tasks (tasks assigned to current user)
export const getMyTasks = async (filters = {}) => {
  const response = await api.get('/tasks/my-tasks', { params: filters });
  return response.data;
};

// Get tasks I created
export const getCreatedTasks = async (filters = {}) => {
  const response = await api.get('/tasks/created', { params: filters });
  return response.data;
};

// Get tasks to evaluate (manager only)
export const getTasksToEvaluate = async () => {
  const response = await api.get('/tasks/to-evaluate');
  return response.data;
};

// Get tasks to approve (admin only)
export const getTasksToApprove = async () => {
  const response = await api.get('/tasks/to-approve');
  return response.data;
};

// Get task by ID
export const getTaskById = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};

// Update task
export const updateTask = async (taskId, taskData) => {
  const response = await api.put(`/tasks/${taskId}`, taskData);
  return response.data;
};

// Update task status
export const updateTaskStatus = async (taskId, status) => {
  const response = await api.put(`/tasks/${taskId}/status`, { status });
  return response.data;
};

// Evaluate task (manager only)
export const evaluateTask = async (taskId, { score, notes }) => {
  const response = await api.post(`/tasks/${taskId}/evaluate`, { score, notes });
  return response.data;
};

// Final approve task (admin only)
export const finalApproveTask = async (taskId) => {
  const response = await api.post(`/tasks/${taskId}/final-approve`);
  return response.data;
};

// Delete task
export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

// Get daily summary
export const getDailySummary = async (date) => {
  const response = await api.get('/tasks/summary/daily', { params: { date } });
  return response.data;
};

// Get weekly summary
export const getWeeklySummary = async (startDate) => {
  const response = await api.get('/tasks/summary/weekly', { params: { startDate } });
  return response.data;
};

// Get task reports
export const getTaskReports = async (filters = {}) => {
  const response = await api.get('/tasks/reports', { params: filters });
  return response.data;
};

// Get total tasks count (all time)
export const getTotalTasks = async () => {
  const response = await api.get('/tasks/total');
  return response.data;
};

export default {
  createTask,
  getMyTasks,
  getCreatedTasks,
  getTasksToEvaluate,
  getTasksToApprove,
  getTaskById,
  updateTask,
  updateTaskStatus,
  evaluateTask,
  finalApproveTask,
  deleteTask,
  getDailySummary,
  getWeeklySummary,
  getTaskReports,
  getTotalTasks
};