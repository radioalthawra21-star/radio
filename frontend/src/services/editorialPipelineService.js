import api from './api';

export const processPipeline = async (text, mode = 'regex') => {
  const response = await api.post('/editorial-pipeline/process', { text, mode });
  return response.data;
};

export const runSingleStage = async (text, stage, mode = 'regex') => {
  const response = await api.post('/editorial-pipeline/stage', { text, stage, mode });
  return response.data;
};

export const checkAIConfig = async () => {
  const response = await api.get('/editorial-pipeline/ai-config');
  return response.data;
};

export default {
  processPipeline,
  runSingleStage,
  checkAIConfig
};
