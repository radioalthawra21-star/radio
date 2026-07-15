/**
 * User Service
 * Handles all user-related API calls
 */

import api from './api';

// Get all employees
export const getAllEmployees = async () => {
  const response = await api.get('/users/employees');
  return response.data;
};

// Get employees by department
export const getEmployeesByDepartment = async (department) => {
  const response = await api.get(`/users/department/${department}`);
  return response.data;
};

// Get all managers
export const getAllManagers = async () => {
  const response = await api.get('/users/managers');
  return response.data;
};

// Get all users (employees and managers)
export const getAllUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

// Get user by ID
export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

// Create user (admin only)
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

// Update user (admin only)
export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

// Delete user (admin only)
export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

// Calculate performance score
export const calculatePerformanceScore = async (userId) => {
  const response = await api.post(`/users/${userId}/calculate-score`);
  return response.data;
};

// Get employee rankings
export const getRankings = async () => {
  const response = await api.get('/users/rankings');
  return response.data;
};

// Get department statistics (enhanced, handles multiple response formats)
export const getDepartmentStats = async () => {
  try {
    const response = await api.get('/users/department-stats');
    let stats = [];
    if (response.data?.success) {
      if (Array.isArray(response.data.data?.stats)) {
        stats = response.data.data.stats;
      } else if (Array.isArray(response.data.data?.departments)) {
        stats = response.data.data.departments;
      } else if (Array.isArray(response.data.data)) {
        stats = response.data.data;
      }
    } else if (Array.isArray(response.data)) {
      stats = response.data;
    }
    return {
      success: true,
      data: {
        stats: stats.map(dept => ({
          department: dept.department || dept._id || '',
          employeeCount: dept.employeeCount || 0,
          averagePerformanceScore: dept.averagePerformanceScore || 0,
          totalTasks: dept.totalTasks || 0,
          completedTasks: dept.completedTasks || 0
        }))
      }
    };
  } catch (error) {
    console.error('getDepartmentStats error:', error);
    return { success: false, error: error.userMessage || 'Failed to fetch department stats', data: { stats: [] } };
  }
};

// Get pending users (not activated)
export const getPendingUsers = async () => {
  const response = await api.get('/users/pending');
  return response.data;
};

// Activate user account
export const activateUser = async (userId) => {
  const response = await api.post(`/users/${userId}/activate`);
  return response.data;
};

// Get user counts
export const getUserCounts = async () => {
  const response = await api.get('/users/counts');
  return response.data;
};

// Change password
export const changePassword = async (passwordData) => {
  const response = await api.put('/users/change-password', passwordData);
  return response.data;
};

// --- Office Management ---
export const getOffices = async () => {
  const response = await api.get('/offices');
  return response.data;
};
export const createOffice = async (data) => {
  const response = await api.post('/offices', data);
  return response.data;
};
export const updateOffice = async (id, data) => {
  const response = await api.put(`/offices/${id}`, data);
  return response.data;
};
export const deleteOffice = async (id) => {
  const response = await api.delete(`/offices/${id}`);
  return response.data;
};
export const assignEmployeesToOffice = async (officeId, employeeIds) => {
  const response = await api.post(`/offices/${officeId}/assign-employees`, { employeeIds });
  return response.data;
};
export const removeEmployeeFromOffice = async (officeId, employeeId) => {
  const response = await api.post(`/offices/${officeId}/remove-employee`, { employeeId });
  return response.data;
};

// --- Office Manager Team Management ---

// Get team members assigned to the current office manager
export const getMyTeam = async () => {
  const response = await api.get('/users/my-team');
  return response.data;
};

// Get office managers in the current manager's department
export const getOfficeManagersInDepartment = async () => {
  const response = await api.get('/users/office-managers');
  return response.data;
};

// Assign employees to an office manager
export const assignToOfficeManager = async (employeeIds, officeManagerId) => {
  const response = await api.post('/users/assign-to-office-manager', { employeeIds, officeManagerId });
  return response.data;
};

// Unassign employees from their office manager
export const unassignFromOfficeManager = async (employeeIds) => {
  const response = await api.delete('/users/unassign-from-office-manager', { data: { employeeIds } });
  return response.data;
};

// Transfer employees between office managers
export const transferOfficeManager = async (employeeIds, fromOfficeManagerId, toOfficeManagerId) => {
  const response = await api.put('/users/transfer-office-manager', { employeeIds, fromOfficeManagerId, toOfficeManagerId });
  return response.data;
};

// Get team assignments summary for a department
export const getTeamAssignments = async () => {
  const response = await api.get('/users/team-assignments');
  return response.data;
};

export default {
  getAllEmployees,
  getEmployeesByDepartment,
  getAllManagers,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  calculatePerformanceScore,
  getRankings,
  getDepartmentStats,
  getPendingUsers,
  activateUser,
  getUserCounts,
  changePassword,
  getMyTeam,
  getOfficeManagersInDepartment,
  assignToOfficeManager,
  unassignFromOfficeManager,
  transferOfficeManager,
  getTeamAssignments,
  getOffices,
  createOffice,
  updateOffice,
  deleteOffice
};
