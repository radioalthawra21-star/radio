import React from 'react';

/**
 * Calculate trend percentage between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} - Percentage change (positive for increase, negative for decrease)
 */
export const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate moving average for trend smoothing
 * @param {number[]} data - Array of data points
 * @param {number} window - Window size for moving average
 * @returns {number[]} - Smoothed data points
 */
export const movingAverage = (data, window = 3) => {
  if (!data || data.length === 0) return [];
  if (window >= data.length) return data;

  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
    const windowData = data.slice(start, end);
    const sum = windowData.reduce((acc, val) => acc + val, 0);
    result.push(sum / windowData.length);
  }
  return result;
};

/**
 * Calculate growth rate over multiple periods
 * @param {number[]} values - Array of values over time
 * @returns {number} - Compound monthly growth rate (as percentage)
 */
export const calculateGrowthRate = (values) => {
  if (!values || values.length < 2) return 0;
  
  const first = values[0];
  const last = values[values.length - 1];
  const periods = values.length - 1;
  
  if (first === 0) return last > 0 ? 100 : 0;
  
  return Math.pow(last / first, 1 / periods) - 1;
};

/**
 * Format number with thousand separators and decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num, decimals = 0) => {
  if (isNaN(num)) return '0';
  return Number(num).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format currency with symbol
 * @param {number} amount - Amount to format
 * @param {string} symbol - Currency symbol (default: '$')
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, symbol = '$', decimals = 2) => {
  if (isNaN(amount)) return `${symbol}0.00`;
  return `${symbol}${Number(Math.abs(amount)).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${amount < 0 ? '-' : ''}`;
};

export default {
  calculateTrend,
  movingAverage,
  calculateGrowthRate,
  formatNumber,
  formatCurrency
};