import api from './api';

export const getFinancialMiscList = (params) => api.get('/financial-misc', { params });
export const getFinancialMiscById = (id) => api.get(`/financial-misc/${id}`);
export const createFinancialMisc = (data) => api.post('/financial-misc', data);
export const updateFinancialMisc = (id, data) => api.put(`/financial-misc/${id}`, data);
export const deleteFinancialMisc = (id) => api.delete(`/financial-misc/${id}`);
export const archiveMonth = (month) => api.post('/financial-misc/archive-month', { month });
