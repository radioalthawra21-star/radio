import api from './api';

export const getDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const getEmployeePerformance = async () => {
  const res = await api.get('/dashboard/employee-performance');
  return res.data;
};

export const getDepartmentPerformance = async () => {
  const res = await api.get('/dashboard/department-performance');
  return res.data;
};

export const getBottleneckStages = async () => {
  const res = await api.get('/dashboard/bottlenecks');
  return res.data;
};

export const getAvgCompletionTime = async () => {
  const res = await api.get('/dashboard/avg-completion-time');
  return res.data;
};

export default {
  getDashboardStats, getEmployeePerformance,
  getDepartmentPerformance, getBottleneckStages, getAvgCompletionTime
};
