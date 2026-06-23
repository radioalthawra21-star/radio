import api from './api';

export const processCoupletPipeline = async (text, mode = 'regex', model = null) => {
  const response = await api.post('/couplet-pipeline/process', { text, mode, model });
  return response.data;
};

export const runSingleStage = async (text, stage, mode = 'regex', model = null) => {
  const response = await api.post('/couplet-pipeline/stage', { text, stage, mode, model });
  return response.data;
};

export const checkAIConfig = async () => {
  const response = await api.get('/couplet-pipeline/ai-config');
  return response.data;
};

export default {
  processCoupletPipeline,
  runSingleStage,
  checkAIConfig
};
