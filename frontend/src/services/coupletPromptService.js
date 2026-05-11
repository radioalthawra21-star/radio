import api from './api';

export const getAllPrompts = async () => {
  const response = await api.get('/couplet-prompts');
  return response.data;
};

export const getPromptByStage = async (stage) => {
  const response = await api.get(`/couplet-prompts/${stage}`);
  return response.data;
};

export const updatePrompt = async (stage, data) => {
  const response = await api.put(`/couplet-prompts/${stage}`, data);
  return response.data;
};

export const resetPrompts = async () => {
  const response = await api.post('/couplet-prompts/reset');
  return response.data;
};
