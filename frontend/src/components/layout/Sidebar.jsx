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
    { path: '/well-being', label: 'الحالة اليومية', icon: '😊' }
  ],
  manager: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/manager/assign-tasks', label: 'إسناد المهام', icon: '👥' },
    { path: '/manager/evaluate-tasks', label: 'تقييم المهام', icon: '⭐' },
    { path: '/manager/reports', label: 'تقارير القسم', icon: '📊' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👤' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/evaluate-manager', label: 'تقييم المدير', icon: '📝' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' }
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
    { path: '/admin/settings', label: 'الإعدادات', icon: '⚙️' }
  ]
};

const departmentNames = {
  production: 'الإنتاج',
  news: 'الأخبار',
  marketing: 'التسويق'
};

const Sidebar = ({ isOpen, setIsOpen, user }) => {
  const role = user?.role || 'employee';
  const items = menuItems[role] || menuItems.employee;
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
        <div className="p-4 border-b border-gray-700">
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
          <div className="p-4 border-b border-gray-700">
            <div className="bg-primary/20 rounded-lg p-3">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-300">
                {role === 'admin' ? 'المدير العام' : 
                 role === 'manager' ? `مدير ${departmentNames[user.department] || ''}` : 'موظف'}
              </p>
            </div>
          </div>
        )}

        <nav className="p-2">
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
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;