/**
 * Reusable Status Badge Component
 * Provides standardized status badges with consistent styling
 */

import React from 'react';

const StatusBadge = ({ isActive, size = 'sm' }) => {
  // Status configuration
  const statusConfig = isActive
    ? {
        label: 'نشط',
        badgeClass: 'bg-secondary-20 text-secondary',
        icon: '✅'
      }
    : {
        label: 'غير نشط',
        badgeClass: 'bg-gray-200 text-gray-700',
        icon: '❌'
      };

  // Size configurations
  const sizeConfig = {
    xs: 'text-xs px-1 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const sizeClass = sizeConfig[size] || sizeConfig.sm;

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.badgeClass} ${sizeClass}`}>
      {statusConfig.icon} {statusConfig.label}
    </span>
  );
};

export default StatusBadge;