/**
 * Task Service
 * Handles all task-related API calls
 */

import api from './api';

async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Task Service Error:', error?.response?.data || error.message);
    throw error;
  }
}

// Create new task
export const createTask = async (taskData) => {
  return handleApiCall(() => api.post('/tasks', taskData));
};

// Get my tasks (tasks assigned to current user)
export const getMyTasks = async (filters = {}) => {
  return handleApiCall(() => api.get('/tasks/my-tasks', { params: filters }));
};

// Get tasks I created
export const getCreatedTasks = async (filters = {}) => {
  return handleApiCall(() => api.get('/tasks/created', { params: filters }));
};

// Get tasks to evaluate (manager only)
export const getTasksToEvaluate = async () => {
  return handleApiCall(() => api.get('/tasks/to-evaluate'));
};

// Get tasks to approve (admin only)
export const getTasksToApprove = async () => {
  return handleApiCall(() => api.get('/tasks/to-approve'));
};

// Get task by ID
export const getTaskById = async (taskId) => {
  return handleApiCall(() => api.get(`/tasks/${taskId}`));
};

// Update task
export const updateTask = async (taskId, taskData) => {
  return handleApiCall(() => api.put(`/tasks/${taskId}`, taskData));
};

// Update task status (with optional rejection reason)
export const updateTaskStatus = async (taskId, status, extra = {}) => {
  return handleApiCall(() => api.put(`/tasks/${taskId}/status`, { status, ...extra }));
};

// Add employee notes to a task
export const addTaskNotes = async (taskId, notes) => {
  return handleApiCall(() => api.put(`/tasks/${taskId}/notes`, { notes }));
};

// Add manager note to a task
export const addManagerNote = async (taskId, note) => {
  return handleApiCall(() => api.put(`/tasks/${taskId}/manager-note`, { note }));
};

// Department manager approves a pending task
export const approveDepartmentTask = async (taskId) => {
  return handleApiCall(() => api.put(`/tasks/${taskId}/department-approve`));
};

// Department manager rejects a pending task
export const rejectDepartmentTask = async (taskId, reason = '') => {
  return handleApiCall(() => api.put(`/tasks/${taskId}/department-reject`, { reason }));
};

// Evaluate task (manager only)
export const evaluateTask = async (taskId, { score, notes }) => {
  return handleApiCall(() => api.post(`/tasks/${taskId}/evaluate`, { score, notes }));
};

// Final approve task (admin only)
export const finalApproveTask = async (taskId) => {
  return handleApiCall(() => api.post(`/tasks/${taskId}/final-approve`));
};

// Delete task
export const deleteTask = async (taskId) => {
  return handleApiCall(() => api.delete(`/tasks/${taskId}`));
};

// Get daily summary
export const getDailySummary = async (date, scope) => {
  return handleApiCall(() => api.get('/tasks/summary/daily', { params: { date, scope } }));
};

// Get weekly summary
export const getWeeklySummary = async (startDate) => {
  return handleApiCall(() => api.get('/tasks/summary/weekly', { params: { startDate } }));
};

// Get task reports (enhanced, handles multiple response formats)
export const getTaskReports = async (filters = {}) => {
  try {
    const response = await api.get('/tasks/reports', { params: filters });
    return {
      success: true,
      data: { tasks: response.data?.tasks || [] }
    };
  } catch (error) {
    console.error('getTaskReports error:', error);
    return {
      success: false,
      error: error.userMessage || 'Failed to fetch task reports',
      data: { tasks: [] }
    };
  }
};

// Get total tasks count (all time)
export const getTotalTasks = async () => {
  return handleApiCall(() => api.get('/tasks/total'));
};

// Get pending proposals (manager)
export const getProposals = async () => {
  return handleApiCall(() => api.get('/tasks/proposals'));
};

// Approve a proposal (manager)
export const approveProposal = async (taskId) => {
  return handleApiCall(() => api.post(`/tasks/${taskId}/approve-proposal`));
};

// Reject a proposal (manager)
export const rejectProposal = async (taskId, reason = '') => {
  return handleApiCall(() => api.post(`/tasks/${taskId}/reject-proposal`, { reason }));
};

// Get all tasks from department employees (manager)
export const getDepartmentTasks = async (filters = {}) => {
  return handleApiCall(() => api.get('/tasks/department', { params: filters }));
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
  getTotalTasks,
  getProposals,
  approveProposal,
  rejectProposal,
  addTaskNotes,
  addManagerNote,
  approveDepartmentTask,
  rejectDepartmentTask,
  getDepartmentTasks
};