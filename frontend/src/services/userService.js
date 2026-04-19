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

// Get department statistics
export const getDepartmentStats = async () => {
  const response = await api.get('/users/department-stats');
  return response.data;
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
  activateUser
};
