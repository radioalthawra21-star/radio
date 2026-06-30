import { FaChartBar, FaFingerprint, FaUsers, FaCog } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';

const navItems = [

  { path: '/admin/attendance', label: 'إدارة الحضور', icon: FaUsers, roles: ['admin'] },
  { path: '/admin/employee-attendance-report', label: 'تقرير الموظفين', icon: FaChartBar, roles: ['admin'] },
  { path: '/biometric', label: 'جهاز البصمة', icon: FaFingerprint, roles: ['admin', 'manager', 'hr'] },
  { path: '/attendance/employee', label: 'سجلي الشخصي', icon: FaCog, roles: ['employee', 'manager'] },
];

const AttendanceNavBar = ({ userRole }) => {
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => item.roles.includes(userRole)
  );

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
      {visibleItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

export default AttendanceNavBar;
