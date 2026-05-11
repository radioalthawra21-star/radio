/**
 * Reusable Role Badge Component
 * Provides standardized role badges with consistent styling
 */

import React from 'react';

const RoleBadge = ({ role, size = 'sm' }) => {
  // Role configuration
  const roleConfig = {
    admin: {
      label: 'مدير عام',
      badgeClass: 'bg-red-100 text-red-700',
      icon: '👨‍💼'
    },
    manager: {
      label: 'مدير قسم',
      badgeClass: 'bg-blue-100 text-blue-700',
      icon: '👔'
    },
    employee: {
      label: 'موظف',
      badgeClass: 'bg-green-100 text-green-700',
      icon: '👷'
    },
    general_manager: {
      label: 'مدير عام',
      badgeClass: 'bg-purple-100 text-purple-700',
      icon: '👨‍💼'
    },
    super_admin: {
      label: 'المالك الرئيسي',
      badgeClass: 'bg-indigo-100 text-indigo-700',
      icon: '👑'
    }
  };

  const config = roleConfig[role] || roleConfig.employee;
  
  // Size configurations
  const sizeConfig = {
    xs: 'text-xs px-1 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const sizeClass = sizeConfig[size] || sizeConfig.sm;

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.badgeClass} ${sizeClass}`}>
      {config.icon} {config.label}
    </span>
  );
};

export default RoleBadge;