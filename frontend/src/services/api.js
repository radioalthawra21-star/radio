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
  timeout: 60000,
  withCredentials: true  // ✅ Important for CORS with cookies/auth
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
    // ✅ Enhanced error handling
    let userMessage = 'حدث خطأ في الاتصال بالخادم';
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      userMessage = data?.message || `خطأ في الخادم (${status})`;
      
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Request made but no response received
      userMessage = 'لا يمكن الاتصال بالخادم. تحقق من الإنترنت';
      console.error('Network Error - No response received');
    } else {
      // Error in request setup
      userMessage = error.message || 'خطأ في إعداد الطلب';
    }
    
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Add user-friendly message to error
    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

// Export api instance
export default api;

// Export uploads URL for profile images
export const UPLOADS_URL = BASE_URL;