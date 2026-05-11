/**
 * Number Utilities
 * Format numbers, currencies, and percentages
 */

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return Number(num).toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: EGP)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'ج.م') => {
  const formatted = formatNumber(amount, 2);
  return `${formatted} ${currency}`;
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Convert to decimal (divide by 100)
 * @param {number} percentage - Percentage value
 * @returns {number} Decimal value
 */
export const toDecimal = (percentage) => {
  return (percentage || 0) / 100;
};

/**
 * Calculate percentage of total
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
export const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return ((part || 0) / total) * 100;
};

/**
 * Round to nearest decimal
 * @param {number} num - Number to round
 * @param {number} decimals - Decimal places
 * @returns {number} Rounded number
 */
export const roundTo = (num, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((num || 0) * factor) / factor;
};

/**
 * Clamp number between min and max
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped number
 */
export const clamp = (num, min, max) => {
  return Math.min(Math.max(num || 0, min), max);
};

export default {
  formatNumber,
  formatCurrency,
  formatPercentage,
  toDecimal,
  calculatePercentage,
  roundTo,
  clamp
};
