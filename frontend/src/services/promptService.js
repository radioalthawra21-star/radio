import api from './api';

export const getAllPrompts = async () => {
  const response = await api.get('/prompts');
  return response.data;
};

export const getPromptByStage = async (stage) => {
  const response = await api.get(`/prompts/${stage}`);
  return response.data;
};

export const updatePrompt = async (stage, data) => {
  const response = await api.put(`/prompts/${stage}`, data);
  return response.data;
};

export const resetPrompts = async () => {
  const response = await api.post('/prompts/reset');
  return response.data;
};
