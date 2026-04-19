/**
 * Authentication Service
 * Handles all authentication API calls
 */

import api from './api';

// Register new user
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.data.success) {
    localStorage.setItem('token', response.data.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  return response.data;
};

// Login user
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  if (response.data.success) {
    localStorage.setItem('token', response.data.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  return response.data;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Get current user
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Change password
export const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData);
  return response.data;
};

// Update profile
export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  if (response.data.success) {
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  return response.data;
};

// Upload profile image
export const uploadProfileImage = async (formData) => {
  const response = await api.put('/auth/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  if (response.data.success) {
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  return response.data;
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!localStorage.getItem('token');
};

// Get stored user
export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
  uploadProfileImage,
  isLoggedIn,
  getStoredUser
};
