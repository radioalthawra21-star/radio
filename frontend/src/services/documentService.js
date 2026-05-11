/**
 * Enhanced Document Service
 * Handles all document-related API calls with upload, versioning, and access control
 */

import api from './api';

// Upload document
export const uploadDocument = async (file, metadata = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add metadata fields
  Object.keys(metadata).forEach(key => {
    if (metadata[key] !== null && metadata[key] !== undefined) {
      if (typeof metadata[key] === 'object') {
        formData.append(key, JSON.stringify(metadata[key]));
      } else {
        formData.append(key, metadata[key]);
      }
    }
  });
  
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

// Get my documents with filtering
export const getMyDocuments = async (params = {}) => {
  const { category, tags, search, page = 1, limit = 20, versionOnly = true } = params;
  
  const queryParams = new URLSearchParams();
  if (category) queryParams.append('category', category);
  if (tags) queryParams.append('tags', Array.isArray(tags) ? tags.join(',') : tags);
  if (search) queryParams.append('search', search);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (versionOnly !== undefined) queryParams.append('versionOnly', versionOnly.toString());
  
  const response = await api.get(`/documents?${queryParams.toString()}`);
  return response.data;
};

// Get document by ID
export const getDocumentById = async (documentId) => {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
};

// Update document metadata
export const updateDocument = async (documentId, updateData) => {
  const response = await api.put(`/documents/${documentId}`, updateData);
  return response.data;
};

// Delete document
export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
};

// Get document versions
export const getDocumentVersions = async (documentId) => {
  const response = await api.get(`/documents/${documentId}/versions`);
  return response.data;
};

// Get document categories
export const getDocumentCategories = async () => {
  const response = await api.get('/documents/categories');
  return response.data;
};

// Get allowed file types
export const getAllowedFileTypes = async () => {
  const response = await api.get('/documents/file-types');
  return response.data;
};

// Download document
export const downloadDocument = async (documentId) => {
  const response = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

// Share document with users/roles/departments
export const shareDocument = async (documentId, shareData) => {
  const response = await api.post(`/documents/${documentId}/share`, shareData);
  return response.data;
};

// Get document preview URL (for supported file types)
export const getDocumentPreviewUrl = async (documentId) => {
  const response = await api.get(`/documents/${documentId}/preview`);
  return response.data;
};

export default {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentCategories,
  getAllowedFileTypes,
  downloadDocument,
  shareDocument,
  getDocumentPreviewUrl
};