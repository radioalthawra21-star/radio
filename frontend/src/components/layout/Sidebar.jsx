import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const menuItems = {
  employee: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/my-tasks', label: 'مهماتي', icon: '📋' },
    { path: '/add-task', label: 'إضافة مهمة', icon: '➕' },
    { path: '/task-history', label: 'سجل المهام', icon: '📜' },
    { path: '/messages', label: 'الرسائل', icon: '✉️' },
    { path: '/evaluate-manager', label: 'تقييم المدير', icon: '⭐' },
    { path: '/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/payroll/my-salary', label: 'راتبي', icon: '💰' },
    { path: '/attendance', label: 'الحضور', icon: '🕐' },
    { path: '/leave-request', label: 'طلب إجازة', icon: '📅' },
    { path: '/financial-misc', label: 'متفرقات مالية', icon: '💳' }
  ],
  manager: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/add-task', label: 'إضافة مهمة', icon: '➕' },
    { path: '/manager/assign-tasks', label: 'إسناد المهام', icon: '👥' },
    { path: '/manager/evaluate-tasks', label: 'تقييم المهام', icon: '⭐' },
    { path: '/manager/reports', label: 'تقارير القسم', icon: '📊' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👤' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
    { path: '/manager/approve-leaves', label: 'الموافقة على الإجازات', icon: '✅' },
    { path: '/admin/leave-management', label: 'إدارة الإجازات', icon: '📝' },
    { path: '/admin/attendance', label: 'الحضور', icon: '🕐' },
    { path: '/financial-misc', label: 'متفرقات مالية', icon: '💳' }
  ],
  hr: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👥' },
    { path: '/admin/attendance', label: 'الحضور', icon: '🕐' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/admin/reports/department', label: 'تقارير الأقسام', icon: '📊' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
    { path: '/financial-misc', label: 'متفرقات مالية', icon: '💳' }
  ],
  admin: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/admin/assign-tasks', label: 'إسناد المهام', icon: '👥' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👥' },
    { path: '/admin/reports', label: 'التقارير', icon: '📊' },
    { path: '/admin/rankings', label: 'الترتيب', icon: '🏆' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/manager-evaluation', label: 'تقييم المديرين', icon: '📊' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/admin/settings', label: 'الإعدادات', icon: '⚙️' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
    { path: '/admin/leave-management', label: 'إدارة الإجازات', icon: '📝' },
    { path: '/admin/attendance', label: 'الحضور', icon: '🕐' },
    { path: '/admin/audit-logs', label: 'سجل التدقيق', icon: '📋' },
    { path: '/financial-misc', label: 'متفرقات مالية', icon: '💳' },
    { path: '/financial-misc/report', label: 'تقرير متفرقات مالية', icon: '📊' }
  ]
};

const departmentNames = {
  financial: 'المالي',
  it: 'تقنية المعلومات',
  marketing: 'التسويق',
  news: 'الأخبار',
  production: 'الإنتاج',
  live_broadcast: 'البث المباشر',
  hr: 'الموارد البشرية',
  'human resources': 'الموارد البشرية',
  المالي: 'المالي',
  'تقنية المعلومات': 'تقنية المعلومات',
  التسويق: 'التسويق',
  الأخبار: 'الأخبار',
  الإنتاج: 'الإنتاج',
  'البث المباشر': 'البث المباشر',
  'الموارد البشرية': 'الموارد البشرية'
};

// Check if user is authorized to access news department features
const isNewsAuthorized = (user) => {
  if (!user) return false;
  const dept = (user.department || '').trim().toLowerCase();
  return dept === 'news' || dept.includes('news') || dept.includes('إعلام');
};

const Sidebar = ({ isOpen, setIsOpen, user }) => {
  const role = user?.role || 'employee';
  const username = user?.username || '';
  let items = menuItems[role] || menuItems.employee;

  // Hide payroll from managers except Mostafa (HR manager)
  if (role === 'manager' && username !== 'mostafa') {
    items = items.filter(item => !item.path.startsWith('/payroll'));
  }

  const newsAuthorized = isNewsAuthorized(user);
  const [appLogo, setAppLogo] = useState(null);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    if (logo) setAppLogo(logo);

    const handleStorageChange = () => {
      const logo = localStorage.getItem(APP_LOGO_KEY);
      setAppLogo(logo || null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appLogoUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appLogoUpdate', handleStorageChange);
    };
  }, []);

  return (
    <>
      <aside 
        className={`fixed right-0 top-0 h-full text-white transition-all duration-300 z-50 ${
          isOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
        style={{ backgroundColor: '#182E4E' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="h-12" style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <img src="/logo.png" alt="Logo" className="h-12" style={{ filter: 'brightness(0) invert(1)' }} />
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="إغلاق القائمة"
              >
                ▶
              </button>
            </div>
          </div>

          {user && (
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="bg-primary/20 rounded-lg p-3 truncate">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-sm text-gray-300 truncate">
                  {role === 'admin' ? 'المدير العام' : 
                   role === 'hr' ? 'مسؤول الموارد البشرية' : 
                   role === 'manager' ? `مدير ${departmentNames[user.department] || ''}` : 'موظف'}
                </p>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-2">
            {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  isActive 
                    ? 'bg-interactive text-white' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* News Department Navigation - Conditional */}
          {newsAuthorized && (
            <>
              <div className="border-t border-gray-600 my-2"></div>
              <NavLink
                key="/news"
                to="/news"
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                    isActive 
                      ? 'bg-interactive text-white' 
                      : 'hover:bg-gray-700 text-gray-300'
                  }`
                }
              >
                <span className="text-xl">📰</span>
                <span>لوحة الأخبار</span>
              </NavLink>
            </>
          )}


          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;