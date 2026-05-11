/**
 * Audit Log Service
 * Handles audit log retrieval, filtering, and export
 */

import api from './api';

// Get audit logs with filtering
export const getAuditLogs = async (params = {}) => {
  const { 
    userId, 
    action, 
    entity, 
    startDate, 
    endDate, 
    riskLevel, 
    page = 1, 
    limit = 50 
  } = params;
  
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('userId', userId);
  if (action) queryParams.append('action', action);
  if (entity) queryParams.append('entity', entity);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (riskLevel) queryParams.append('riskLevel', riskLevel);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  
  const response = await api.get(`/audit-logs?${queryParams.toString()}`);
  return response.data;
};

// Get audit log by ID
export const getAuditLogById = async (auditLogId) => {
  const response = await api.get(`/audit-logs/${auditLogId}`);
  return response.data;
};

// Get audit log statistics
export const getAuditLogStats = async (params = {}) => {
  const { startDate, endDate } = params;
  
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  
  const response = await api.get(`/audit-logs/stats?${queryParams.toString()}`);
  return response.data;
};

// Export audit logs
export const exportAuditLogs = async (params = {}, format = 'csv') => {
  const { 
    userId, 
    action, 
    entity, 
    startDate, 
    endDate, 
    riskLevel 
  } = params;
  
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('userId', userId);
  if (action) queryParams.append('action', action);
  if (entity) queryParams.append('entity', entity);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (riskLevel) queryParams.append('riskLevel', riskLevel);
  queryParams.append('format', format);
  
  const response = await api.get(`/audit-logs/export?${queryParams.toString()}`, {
    responseType: 'blob'
  });
  return response.data;
};

// Get audit actions for filter dropdown
export const getAuditActions = async () => {
  const response = await api.get('/audit-logs/actions');
  return response.data;
};

// Get audit entities for filter dropdown
export const getAuditEntities = async () => {
  const response = await api.get('/audit-logs/entities');
  return response.data;
};

export default {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  exportAuditLogs,
  getAuditActions,
  getAuditEntities
};