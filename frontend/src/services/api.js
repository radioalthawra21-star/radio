/**
 * API Service
 * Axios instance with interceptors for API calls
 * Modified for production deployment
 */

import axios from 'axios';

// ✅ استخدام المتغير البيئي - بدون /api في النهاية
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cc-backend-2ogh.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL + '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// Request interceptor - add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const backendMessage = error.response.data?.message;
      if (backendMessage) {
        error.message = backendMessage;
      }
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Export api instance
export default api;