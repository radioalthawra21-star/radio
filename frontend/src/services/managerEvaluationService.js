/**
 * Manager Evaluation Service
 * Handles manager evaluation API calls
 */

import api from './api';

export const getEvaluationQuestions = async () => {
  const response = await api.get('/manager-evaluation/questions');
  return response.data;
};

export const getSubmissionStatus = async () => {
  const response = await api.get('/manager-evaluation/status');
  return response.data;
};

export const getManagersList = async () => {
  const response = await api.get('/manager-evaluation/managers');
  return response.data;
};

export const submitEvaluation = async (data) => {
  const response = await api.post('/manager-evaluation/submit', data);
  return response.data;
};

export const getResults = async (period) => {
  const response = await api.get('/manager-evaluation/results', { params: { period } });
  return response.data;
};

export const getManagerResults = async (managerId, period) => {
  const response = await api.get(`/manager-evaluation/manager/${managerId}`, { params: { period } });
  return response.data;
};

export const getTrends = async (managerId) => {
  const response = await api.get('/manager-evaluation/trends', { params: { managerId } });
  return response.data;
};

export default {
  getEvaluationQuestions,
  getSubmissionStatus,
  getManagersList,
  submitEvaluation,
  getResults,
  getManagerResults,
  getTrends
};