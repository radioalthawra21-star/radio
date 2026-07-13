/**
 * Authentication Service
 * Handles all authentication API calls
 */

import api from './api';

// Register new user
// NOTE: Do NOT store token here — new users are inactive until admin approval.
// Storing token triggers PublicRoute redirect, making the registration page disappear.
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Login user
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  if (response.data.success) {
    localStorage.setItem('token', response.data.data.token);
    if (response.data.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(response.data.data.user));
  }
  return response.data;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Get stored token
export const getToken = () => {
  return localStorage.getItem('token');
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

export const refreshAuthToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    const response = await api.post('/auth/refresh', { refreshToken });
    if (response.data?.success) {
      const newToken = response.data.data.token;
      localStorage.setItem('token', newToken);
      if (response.data.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
      }
      return newToken;
    }
    return null;
  } catch {
    logout();
    return null;
  }
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
  getStoredUser,
  getToken,
  refreshAuthToken
};
