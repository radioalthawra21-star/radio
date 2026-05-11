import React from 'react';

const StatCard = ({ title, value, icon, color = 'blue', trend }) => {
  // Color mapping
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500'
  };

  const bgColor = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`${bgColor} text-white p-3 rounded-full text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;