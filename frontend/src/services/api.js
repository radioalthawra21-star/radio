/**
 * API Service
 * Axios instance with interceptors for API calls
 * Modified for production deployment
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 300000,
  withCredentials: true
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

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

// Response interceptor - handle errors + token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let userMessage = 'حدث خطأ في الاتصال بالخادم';
    const originalRequest = error.config;

    if (error.response) {
      const { status, data } = error.response;
      userMessage = data?.message || `خطأ في الخادم (${status})`;

      if (status === 401 && !originalRequest?.url?.includes('/auth/login') && !originalRequest?._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await api.post('/auth/refresh', { refreshToken });
            const { token: newToken } = response.data.data;
            localStorage.setItem('token', newToken);
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Fall through to logout
        } finally {
          isRefreshing = false;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        window.location.href = '/login';
      }
    } else if (error.request) {
      userMessage = 'لا يمكن الاتصال بالخادم. تحقق من الإنترنت';
      console.error('Network Error - No response received');
    } else {
      userMessage = error.message || 'خطأ في إعداد الطلب';
    }

    if (error.code !== 'ERR_CANCELED') {
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    }

    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export default api;

export const UPLOADS_URL = BASE_URL;
export const API_BASE_URL = BASE_URL;