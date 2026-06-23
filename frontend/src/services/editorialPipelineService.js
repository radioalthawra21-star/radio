import api from './api';

export const processPipeline = async (text, mode = 'regex', model = null) => {
  const response = await api.post('/editorial-pipeline/process', { text, mode, model });
  return response.data;
};

export const runSingleStage = async (text, stage, mode = 'regex', model = null) => {
  const response = await api.post('/editorial-pipeline/stage', { text, stage, mode, model });
  return response.data;
};

export const checkAIConfig = async () => {
  const response = await api.get('/editorial-pipeline/ai-config');
  return response.data;
};

export const getAIModels = async () => {
  const response = await api.get('/editorial-pipeline/ai-models');
  return response.data;
};

export default {
  processPipeline,
  runSingleStage,
  checkAIConfig,
  getAIModels
};
