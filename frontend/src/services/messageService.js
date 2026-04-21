/**
 * Message Service
 * Handles all message-related API calls
 */

import api from './api';

// Get inbox messages
export const getInboxMessages = async () => {
  const response = await api.get('/messages/inbox');
  return response.data;
};

// Get sent messages
export const getSentMessages = async () => {
  const response = await api.get('/messages/sent');
  return response.data;
};

// Get unread messages count
export const getUnreadCount = async () => {
  const response = await api.get('/messages/unread');
  return response.data;
};

// Send a message
export const sendMessage = async (data) => {
  const response = await api.post('/messages', data);
  return response.data;
};

// Mark message as read
export const markAsRead = async (messageId) => {
  const response = await api.put(`/messages/${messageId}/read`);
  return response.data;
};

// Archive message
export const archiveMessage = async (messageId) => {
  const response = await api.put(`/messages/${messageId}/archive`);
  return response.data;
};

// Delete message
export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/messages/${messageId}`);
  return response.data;
};

export default {
  getInboxMessages,
  getSentMessages,
  getUnreadCount,
  sendMessage,
  markAsRead,
  archiveMessage,
  deleteMessage
};
