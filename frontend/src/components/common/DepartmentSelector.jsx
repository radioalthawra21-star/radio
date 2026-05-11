/**
 * Reusable Department Selector Component
 * Provides a standardized department dropdown with translation support
 */

import React from 'react';

const DepartmentSelector = ({ 
  value, 
  onChange, 
  disabled = false, 
  label = 'القسم',
  required = false,
  includeBlankOption = true,
  blankOptionText = 'الكل'
}) => {
  // Get departments from context or props (would be passed from parent)
  // For now, we'll assume departments are passed as a prop or accessed via context
  
  // This component expects departments to be passed as a prop or accessed via context
  // In a real implementation, we'd use a hook or context to get departments
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{required ? ' *' : ''}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        {includeBlankOption && (
          <option value="">{blankOptionText}</option>
        )}
        {/* Departments would be mapped here */}
        {/* {departments.map(dept => (
          <option key={dept._id} value={dept.name}>
            {getDepartmentName(dept.name)}
          </option>
        )) */}
      </select>
    </div>
  );
};

export default DepartmentSelector;