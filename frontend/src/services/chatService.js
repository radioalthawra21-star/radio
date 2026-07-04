import api from './api';

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Chat Service Error:', error?.response?.data || error.message);
    throw error;
  }
}

export const getMyChats = async () => {
  return handleApiCall(() => api.get('/chat'));
};

export const getChatById = async (id) => {
  return handleApiCall(() => api.get(`/chat/${id}`));
};

export const getChatMessages = async (chatId, { limit = 50, before } = {}) => {
  const params = { limit };
  if (before) params.before = before;
  return handleApiCall(() => api.get(`/chat/${chatId}/messages`, { params }));
};

export const getChatMembers = async (chatId) => {
  return handleApiCall(() => api.get(`/chat/${chatId}/members`));
};

export const getUnreadCount = async () => {
  return handleApiCall(() => api.get('/chat/unread'));
};

export const createSharedChat = async (data) => {
  const safeData = {
    ...data,
    name: data.name ? sanitizeText(data.name) : data.name,
    description: data.description ? sanitizeText(data.description) : data.description
  };
  return handleApiCall(() => api.post('/chat/shared', safeData));
};

export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return handleApiCall(() => api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }));
};

export const addMember = async (chatId, userId) => {
  return handleApiCall(() => api.post('/chat/add-member', { chatId, userId }));
};

export const removeMember = async (chatId, userId) => {
  return handleApiCall(() => api.post('/chat/remove-member', { chatId, userId }));
};

export const archiveChat = async (chatId) => {
  return handleApiCall(() => api.put(`/chat/${chatId}/archive`));
};

export const markChatAsRead = async (chatId) => {
  return handleApiCall(() => api.put(`/chat/${chatId}/read`));
};

export const toggleMute = async (chatId) => {
  return handleApiCall(() => api.put(`/chat/${chatId}/toggle-mute`));
};

export const searchChats = async (query) => {
  const safeQuery = sanitizeText(query);
  return handleApiCall(() => api.get('/chat/search', { params: { q: safeQuery } }));
};

export const deleteChat = async (chatId) => {
  return handleApiCall(() => api.delete(`/chat/${chatId}`));
};

export const toggleLockChat = async (chatId) => {
  return handleApiCall(() => api.put(`/chat/${chatId}/toggle-lock`));
};
