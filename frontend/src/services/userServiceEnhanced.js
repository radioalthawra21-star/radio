/**
 * Enhanced User Service with Error Handling
 */

import api from './api';

// Get department statistics with safe data handling
export const getDepartmentStats = async () => {
  try {
    const response = await api.get('/users/department-stats');
    
    // ✅ Handle multiple response formats safely
    let stats = [];
    
    if (response.data?.success) {
      // Format 1: { success: true, data: { stats: [...] } }
      if (Array.isArray(response.data.data?.stats)) {
        stats = response.data.data.stats;
      }
      // Format 2: { success: true, data: { departments: [...] } }
      else if (Array.isArray(response.data.data?.departments)) {
        stats = response.data.data.departments;
      }
      // Format 3: { success: true, data: [...] }
      else if (Array.isArray(response.data.data)) {
        stats = response.data.data;
      }
      // Format 4: Direct array
      else if (Array.isArray(response.data)) {
        stats = response.data;
      }
    }
    
    return {
      success: true,
      data: {
        stats: stats.map(dept => ({
          department: dept.department || dept._id || '',
          employeeCount: dept.employeeCount || 0,
          averagePerformanceScore: dept.averagePerformanceScore || 0,
          totalTasks: dept.totalTasks || 0,
          completedTasks: dept.completedTasks || 0
        }))
      }
    };
  } catch (error) {
    console.error('getDepartmentStats error:', error);
    return {
      success: false,
      error: error.userMessage || 'Failed to fetch department stats',
      data: { stats: [] }
    };
  }
};

// Get task reports with error handling
export const getTaskReports = async (filters = {}) => {
  try {
    const response = await api.get('/tasks/reports', { params: filters });
    return {
      success: true,
      data: {
        tasks: response.data?.tasks || []
      }
    };
  } catch (error) {
    console.error('getTaskReports error:', error);
    return {
      success: false,
      error: error.userMessage || 'Failed to fetch task reports',
      data: { tasks: [] }
    };
  }
};

// Get daily summary with error handling
export const getDailySummary = async () => {
  try {
    const response = await api.get('/tasks/daily-summary');
    return {
      success: true,
      data: {
        summary: response.data?.summary || {
          total: 0,
          completed: 0,
          inProgress: 0,
          unusual: 0,
          totalHours: 0
        }
      }
    };
  } catch (error) {
    console.error('getDailySummary error:', error);
    return {
      success: false,
      error: error.userMessage || 'Failed to fetch daily summary',
      data: { summary: null }
    };
  }
};

export default {
  getDepartmentStats,
  getTaskReports,
  getDailySummary
};
