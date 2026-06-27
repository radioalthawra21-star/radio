import api from './api';

export const getMyChats = async () => {
  const res = await api.get('/chat');
  return res.data;
};

export const getChatById = async (id) => {
  const res = await api.get(`/chat/${id}`);
  return res.data;
};

export const getChatMessages = async (chatId, { limit = 50, before } = {}) => {
  const params = { limit };
  if (before) params.before = before;
  const res = await api.get(`/chat/${chatId}/messages`, { params });
  return res.data;
};

export const getChatMembers = async (chatId) => {
  const res = await api.get(`/chat/${chatId}/members`);
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get('/chat/unread');
  return res.data;
};

export const createSharedChat = async (data) => {
  const res = await api.post('/chat/shared', data);
  return res.data;
};

export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const addMember = async (chatId, userId) => {
  const res = await api.post('/chat/add-member', { chatId, userId });
  return res.data;
};

export const removeMember = async (chatId, userId) => {
  const res = await api.post('/chat/remove-member', { chatId, userId });
  return res.data;
};

export const archiveChat = async (chatId) => {
  const res = await api.put(`/chat/${chatId}/archive`);
  return res.data;
};

export const markChatAsRead = async (chatId) => {
  const res = await api.put(`/chat/${chatId}/read`);
  return res.data;
};

export const toggleMute = async (chatId) => {
  const res = await api.put(`/chat/${chatId}/toggle-mute`);
  return res.data;
};

export const searchChats = async (query) => {
  const res = await api.get('/chat/search', { params: { q: query } });
  return res.data;
};

export const deleteChat = async (chatId) => {
  const res = await api.delete(`/chat/${chatId}`);
  return res.data;
};

export const toggleLockChat = async (chatId) => {
  const res = await api.put(`/chat/${chatId}/toggle-lock`);
  return res.data;
};
