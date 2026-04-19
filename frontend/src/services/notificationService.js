/**
 * Notification Service
 * Handles all notification-related API calls
 */

import api from './api';

// Get my notifications
export const getMyNotifications = async (unreadOnly = false) => {
  const response = await api.get('/notifications', { params: { unreadOnly } });
  return response.data;
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};

// Clear read notifications
export const clearReadNotifications = async () => {
  const response = await api.delete('/notifications/clear-read');
  return response.data;
};

// Get settings
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

// Update setting
export const updateSetting = async (key, value) => {
  const response = await api.put(`/settings/${key}`, { value });
  return response.data;
};

// Update multiple settings
export const updateMultipleSettings = async (settings) => {
  const response = await api.put('/settings', settings);
  return response.data;
};

// Get evaluation weights
export const getEvaluationWeights = async () => {
  const response = await api.get('/settings/weights');
  return response.data;
};

// Reset settings to default
export const resetSettings = async () => {
  const response = await api.post('/settings/reset');
  return response.data;
};

export default {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getSettings,
  updateSetting,
  updateMultipleSettings,
  getEvaluationWeights,
  resetSettings
};
