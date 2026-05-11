/**
 * Reusable Empty State Component
 * Provides a consistent empty state display across the application
 */

import React from 'react';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  actionButton,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-gray-500 py-12 ${className}`}>
      {icon && <div className="mb-6">{icon}</div>}
      <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
      {description && <p className="text-gray-600 mb-6">{description}</p>}
      {actionButton && (
        <div className="mt-4">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default EmptyState;