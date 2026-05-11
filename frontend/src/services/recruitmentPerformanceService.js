/**
 * Recruitment & Performance Service
 * Handles job postings, candidate applications, performance reviews, and KPIs
 */

import api from './api';

// =====================
// JOB POSTING SERVICES
// =====================

/**
 * Create a new job posting
 */
export const createJobPosting = async (jobData) => {
  const response = await api.post('/recruitment/jobs', jobData);
  return response.data;
};

/**
 * Get all job postings with filters
 */
export const getJobPostings = async (params = {}) => {
  const response = await api.get('/recruitment/jobs', { params });
  return response.data;
};

/**
 * Get single job posting
 */
export const getJobPosting = async (id) => {
  const response = await api.get(`/recruitment/jobs/${id}`);
  return response.data;
};

/**
 * Update job posting
 */
export const updateJobPosting = async (id, jobData) => {
  const response = await api.put(`/recruitment/jobs/${id}`, jobData);
  return response.data;
};

/**
 * Delete job posting
 */
export const deleteJobPosting = async (id) => {
  const response = await api.delete(`/recruitment/jobs/${id}`);
  return response.data;
};

/**
 * Update job posting status
 */
export const updateJobStatus = async (id, statusData) => {
  const response = await api.put(`/recruitment/jobs/${id}/status`, statusData);
  return response.data;
};

/**
 * Get job statistics
 */
export const getJobStats = async () => {
  try {
    const response = await api.get('/recruitment/jobs/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch job stats:', error);
    // Re-throw with user-friendly message
    throw error;
  }
};

// ===========================
// CANDIDATE APPLICATION SERVICES
// ===========================

/**
 * Create a new candidate application
 */
export const createApplication = async (applicationData) => {
  const response = await api.post('/recruitment/applications', applicationData);
  return response.data;
};

/**
 * Get all applications with filters
 */
export const getApplications = async (params = {}) => {
  const response = await api.get('/recruitment/applications', { params });
  return response.data;
};

/**
 * Update application status
 */
export const updateApplicationStatus = async (id, statusData) => {
  const response = await api.put(`/recruitment/applications/${id}/status`, statusData);
  return response.data;
};

/**
 * Add interview feedback
 */
export const addInterviewFeedback = async (id, feedbackData) => {
  const response = await api.post(`/recruitment/applications/${id}/feedback`, feedbackData);
  return response.data;
};

// =============================
// PERFORMANCE REVIEW SERVICES
// =============================

/**
 * Create a performance review
 */
export const createPerformanceReview = async (reviewData) => {
  const response = await api.post('/performance/reviews', reviewData);
  return response.data;
};

/**
 * Get performance reviews with filters
 */
export const getPerformanceReviews = async (params = {}) => {
  const response = await api.get('/performance/reviews', { params });
  return response.data;
};

/**
 * Submit self assessment
 */
export const submitSelfAssessment = async (id, assessmentData) => {
  const response = await api.put(`/performance/reviews/${id}/self-assessment`, assessmentData);
  return response.data;
};

/**
 * Submit manager assessment
 */
export const submitManagerAssessment = async (id, assessmentData) => {
  const response = await api.put(`/performance/reviews/${id}/manager-assessment`, assessmentData);
  return response.data;
};

/**
 * Add peer feedback
 */
export const addPeerFeedback = async (id, feedbackData) => {
  const response = await api.post(`/performance/reviews/${id}/peer-feedback`, feedbackData);
  return response.data;
};

/**
 * Submit promotion recommendation
 */
export const submitPromotionRecommendation = async (id, recommendationData) => {
  const response = await api.put(`/performance/reviews/${id}/promotion`, recommendationData);
  return response.data;
};

/**
 * Approve performance review
 */
export const approvePerformanceReview = async (id) => {
  const response = await api.put(`/performance/reviews/${id}/approve`);
  return response.data;
};

// ============
// KPI SERVICES
// ============

/**
 * Create a KPI
 */
export const createKPI = async (kpiData) => {
  const response = await api.post('/performance/kpis', kpiData);
  return response.data;
};

/**
 * Get all KPIs
 */
export const getKPIs = async (params = {}) => {
  const response = await api.get('/performance/kpis', { params });
  return response.data;
};

/**
 * Update KPI
 */
export const updateKPI = async (id, kpiData) => {
  const response = await api.put(`/performance/kpis/${id}`, kpiData);
  return response.data;
};

/**
 * Delete KPI
 */
export const deleteKPI = async (id) => {
  const response = await api.delete(`/performance/kpis/${id}`);
  return response.data;
};

export default {
  // Job Posting Services
  createJobPosting,
  getJobPostings,
  getJobPosting,
  updateJobPosting,
  deleteJobPosting,
  updateJobStatus,
  getJobStats,
  
  // Candidate Application Services
  createApplication,
  getApplications,
  updateApplicationStatus,
  addInterviewFeedback,
  
  // Performance Review Services
  createPerformanceReview,
  getPerformanceReviews,
  submitSelfAssessment,
  submitManagerAssessment,
  addPeerFeedback,
  submitPromotionRecommendation,
  approvePerformanceReview,
  
  // KPI Services
  createKPI,
  getKPIs,
  updateKPI,
  deleteKPI
};
