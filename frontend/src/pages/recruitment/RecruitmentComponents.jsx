export const StatusBadge = ({ status, type = 'default' }) => {
  const statusConfig = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'مسودة' },
    open: { bg: 'bg-green-100', text: 'text-green-800', label: 'مفتوح' },
    closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'مغلق' },
    filled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ممتلئ' },
    applied: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'تم التقديم' },
    screening: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'فحص أولي' },
    interview: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'مقابلة' },
    offer: { bg: 'bg-green-100', text: 'text-green-800', label: 'عرض' },
    hired: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'تم التوظيف' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'مرفوض' },
    draft_review: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'مسودة' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'قيد التقييم' },
    completed: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'مكتمل' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'تمت الموافقة' }
  };
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export const StatCard = ({ title, value, icon, color, trend }) => {
  const colorConfig = {
    blue: 'bg-blue-500', green: 'bg-green-500',
    orange: 'bg-orange-500', purple: 'bg-purple-500', red: 'bg-red-500'
  };
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`${colorConfig[color] || colorConfig.blue} text-white p-3 rounded-full text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
