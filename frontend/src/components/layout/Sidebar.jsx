import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const menuItems = {
  employee: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/tasks', label: 'المهام', icon: '📋' },
    { path: '/messages', label: 'الرسائل', icon: '✉️' },
    { path: '/chat', label: 'المحادثات', icon: '💬' },
    { path: '/evaluate-manager', label: 'تقييم المدير', icon: '⭐' },
    { path: '/well-being', label: 'الحالة اليومية', icon: '😊' },

    { path: '/attendance', label: 'الحضور', icon: '🕐' },
    { path: '/leave-request', label: 'طلب إجازة', icon: '📅' },
    { path: '/admin/supervisor', label: 'تقرير الموظفين', icon: '📊' },
    { path: '/admin/holidays', label: 'العطل الرسمية', icon: '🎉' },
  ],
  manager: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/tasks', label: 'المهام', icon: '📋' },
    { path: '/manager/reports', label: 'تقارير القسم', icon: '📊' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👤' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/leave-request', label: 'طلب إجازة', icon: '📅' },
    { path: '/chat', label: 'المحادثات', icon: '💬' },
    { path: '/manager/approve-leaves', label: 'الموافقة على الإجازات', icon: '✅' },
  ],
  hr: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/tasks', label: 'المهام', icon: '📋' },
    { path: '/chat', label: 'المحادثات', icon: '💬' },
    { path: '/admin/holidays', label: 'العطل الرسمية', icon: '🎉' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👥' },
    { path: '/admin/attendance/dashboard', label: 'لوحة البصمة والحضور', icon: '🕐' },
    { path: '/admin/timesheet', label: 'كشف الحضور الشهري', icon: '📊' },
    { path: '/admin/supervisor', label: 'Temp-Supervisor', icon: '🔬' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/admin/reports/department', label: 'تقارير الأقسام', icon: '📊' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
  ],
  admin: [
    { path: '/', label: 'لوحة التحكم', icon: '🏠' },
    { path: '/tasks', label: 'المهام', icon: '📋' },
    { path: '/chat', label: 'المحادثات', icon: '💬' },
    { path: '/admin/employees', label: 'الموظفين', icon: '👥' },
    { path: '/admin/reports', label: 'التقارير', icon: '📊' },
    { path: '/admin/rankings', label: 'الترتيب', icon: '🏆' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/manager-evaluation', label: 'تقييم المديرين', icon: '📊' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/admin/settings', label: 'الإعدادات', icon: '⚙️' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
    { path: '/admin/leave-management', label: 'إدارة الإجازات', icon: '📝' },
    { path: '/admin/attendance/dashboard', label: 'لوحة البصمة والحضور', icon: '🕐' },
    { path: '/admin/timesheet', label: 'كشف الحضور الشهري', icon: '📊' },
    { path: '/admin/supervisor', label: 'Temp-Supervisor', icon: '🔬' },
    { path: '/admin/holidays', label: 'العطل الرسمية', icon: '🎉' },
    { path: '/admin/audit-logs', label: 'سجل التدقيق', icon: '📋' },

    { path: '/financial-misc/report', label: 'تقرير متفرقات مالية', icon: '📊' },

    { path: '/workflows', label: 'قوالب سير العمل', icon: '📋' },
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
  return dept === 'news' || dept === 'الأخبار' || dept === 'تحرير' || dept.includes('news') || dept.includes('إعلام') || dept.includes('تحرير');
};

const Sidebar = ({ isOpen, setIsOpen, user, onToggleChat }) => {
  const role = user?.role || 'employee';
  const username = user?.username || '';
  const userDept = (user?.department || '').toString().toLowerCase().trim();
  const isHrEmployee = role === 'employee' && (userDept === 'hr' || userDept === 'الموارد البشرية' || userDept.includes('موارد بشرية'));
  let items = menuItems[role] || menuItems.employee;

  // Show HR-related pages only for HR department employees
  if (role === 'employee' && !isHrEmployee) {
    items = items.filter(item => !['/admin/supervisor', '/admin/holidays'].includes(item.path));
  }

  const newsAuthorized = isNewsAuthorized(user);
  const [appLogo, setAppLogo] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sidebarRef = useRef(null);
  const touchStartRef = useRef(0);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    if (logo) setAppLogo(logo);

    const handleStorageChange = () => {
      const logo = localStorage.getItem(APP_LOGO_KEY);
      setAppLogo(logo || null);
    };

    const handleResize = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appLogoUpdate', handleStorageChange);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appLogoUpdate', handleStorageChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!isOpen) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    // In RTL: swiping left (negative dx) from edge toward center should close
    if (dx < -50) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-full text-white transition-all duration-300 z-50 ${
          isOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
        style={{ backgroundColor: '#182E4E' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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
              item.path === '/chat' ? (
                <button
                  key={item.path}
                  onClick={onToggleChat}
                  className="flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors w-full text-right hover:bg-gray-700 text-gray-300"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ) : (
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
              )
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

              <div className="pr-2 mr-2 border-r border-gray-600">
                <p className="text-xs text-gray-400 px-3 mt-2 mb-1">🤖 الذكاء الاصطناعي</p>
                <NavLink
                  key="/news/editorial-pipeline"
                  to="/news/editorial-pipeline"
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                      isActive 
                        ? 'bg-interactive text-white' 
                        : 'hover:bg-gray-700 text-gray-300'
                    }`
                  }
                >
                  <span className="text-xl">🧠</span>
                  <span>تحرير النصوص</span>
                </NavLink>
                <NavLink
                  key="/news/couplet-pipeline"
                  to="/news/couplet-pipeline"
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                      isActive 
                        ? 'bg-interactive text-white' 
                        : 'hover:bg-gray-700 text-gray-300'
                    }`
                  }
                >
                  <span className="text-xl">🔤</span>
                  <span>تحرير الفيديو جراف</span>
                </NavLink>
                {(role === 'admin' || role === 'manager') && (
                  <NavLink
                    key="/news/prompts"
                    to="/news/prompts"
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                        isActive 
                          ? 'bg-interactive text-white' 
                          : 'hover:bg-gray-700 text-gray-300'
                      }`
                    }
                  >
                    <span className="text-xl">⚙️</span>
                    <span>البرومتات</span>
                  </NavLink>
                )}
              </div>
            </>
          )}


          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;