/**
 * Enhanced Document Service
 * Handles all document-related API calls with upload, versioning, and access control
 */

import api from './api';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file) {
  if (!file) {
    throw new Error('الملف مطلوب');
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`نوع الملف غير مدعوم: ${file.type}. الأنواع المدعومة: PDF, Word, Excel, صور, نص`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB). الحد الأقصى: 50MB`);
  }
}

async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Document Service Error:', error?.response?.data || error.message);
    throw error;
  }
}

// Upload document
export const uploadDocument = async (file, metadata = {}) => {
  validateFile(file);

  const formData = new FormData();
  formData.append('file', file);

  Object.keys(metadata).forEach(key => {
    if (metadata[key] !== null && metadata[key] !== undefined) {
      if (typeof metadata[key] === 'object') {
        formData.append(key, JSON.stringify(metadata[key]));
      } else {
        formData.append(key, metadata[key]);
      }
    }
  });

  return handleApiCall(() => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }));
};

// Get my documents with filtering
export const getMyDocuments = async (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      qs.append(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  });
  return handleApiCall(() => api.get(`/documents?${qs.toString()}`));
};

// Get document by ID
export const getDocumentById = async (documentId) => {
  return handleApiCall(() => api.get(`/documents/${documentId}`));
};

// Update document metadata
export const updateDocument = async (documentId, updateData) => {
  return handleApiCall(() => api.put(`/documents/${documentId}`, updateData));
};

// Delete document
export const deleteDocument = async (documentId) => {
  return handleApiCall(() => api.delete(`/documents/${documentId}`));
};

// Get document versions
export const getDocumentVersions = async (documentId) => {
  return handleApiCall(() => api.get(`/documents/${documentId}/versions`));
};

// Get document categories
export const getDocumentCategories = async () => {
  return handleApiCall(() => api.get('/documents/categories'));
};

// Get allowed file types
export const getAllowedFileTypes = async () => {
  return handleApiCall(() => api.get('/documents/file-types'));
};

// Download document
export const downloadDocument = async (documentId) => {
  return handleApiCall(() => api.get(`/documents/${documentId}/download`, { responseType: 'blob' }));
};

// Share document with users/roles/departments
export const shareDocument = async (documentId, shareData) => {
  return handleApiCall(() => api.post(`/documents/${documentId}/share`, shareData));
};

// Get document preview URL (for supported file types)
export const getDocumentPreviewUrl = async (documentId) => {
  return handleApiCall(() => api.get(`/documents/${documentId}/preview`));
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