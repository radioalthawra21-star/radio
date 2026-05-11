import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredUser } from '../services/authService';
import { useLocation } from 'react-router-dom';

const APP_LOGO_KEY = 'appLogo';

const payrollSubItems = [
  { path: '/payroll', label: 'لوحة الرواتب', icon: '📋' },
  { path: '/payroll/processing', label: 'معالجة الرواتب', icon: '⚙️' },
  { path: '/payroll/pending-assignments', label: 'مراجعة الرواتب الجديدة', icon: '⏰' },
  { path: '/payroll/dashboard', label: 'تقارير الرواتب', icon: '📊' },
  { path: '/payroll/policies', label: 'سياسات الرواتب', icon: '📋' },
  { path: '/payroll/audit', label: 'تدقيق الرواتب', icon: '🔍' },
];

const menuItems = {
  employee: [
    { path: "/", label: "لوحة التحكم", icon: "🏠" },
    { path: "/tasks", label: "مهماتي", icon: "📋" },
    { path: "/tasks/add", label: "إضافة مهمة", icon: "➕" },
    { path: "/tasks/history", label: "سجل المهام", icon: "📜" },
    { path: "/attendance", label: "الحضور والانصراف", icon: "📅" },
    { path: "/leave-management", label: "طلب إجازة", icon: "📝" },
    { path: "/employee/payroll", label: "رواتبي", icon: "💰" },
    { path: "/payslip", label: "كشف الراتب", icon: "📄" },
    { path: "/messages", label: "الرسائل", icon: "✉️" },
    { path: "/recruitment-performance", label: "التوظيف والأداء", icon: "📊" },
    { path: "/manager-evaluation", label: "تقييم المدير", icon: "⭐" },
    { path: "/well-being", label: "الحالة اليومية", icon: "😊" }
  ],
  manager: [
    { path: "/", label: "لوحة التحكم", icon: "🏠" },
    { path: "/tasks/add", label: "إضافة مهمة", icon: "➕" },
    { path: "/manager/assign-tasks", label: "إسناد المهام", icon: "👥" },
    { path: "/manager/evaluate-tasks", label: "تقييم المهام", icon: "⭐" },
    { path: "/manager/reports", label: "تقارير القسم", icon: "📊" },
    { path: "/employees", label: "الموظفين", icon: "👤" },
    { path: "/attendance", label: "الحضور والانصراف", icon: "📅" },
    { path: "/leave-management", label: "إدارة الإجازات", icon: "📝" },
    { path: "/well-being", label: "الحالة اليومية", icon: "😊" },
    { path: "/recruitment-performance", label: "التوظيف والأداء", icon: "📊" }
  ],
  admin: [
    { path: "/", label: "لوحة التحكم", icon: "🏠" },
    { path: "/admin/assign-tasks", label: "إسناد المهام", icon: "👥" },
    { path: "/admin/employees", label: "الموظفين", icon: "👤" },
    { path: "/admin/reports", label: "التقارير", icon: "📊" },
    { path: "/admin/rankings", label: "الترتيب", icon: "🏆" },
    { path: "/admin/bonuses", label: "المكافآت", icon: "🎁" },
    { path: "/admin/attendance", label: "الحضور والانصراف", icon: "📅" },
    { path: "/admin/leave-management", label: "إدارة الإجازات", icon: "📝" },
    { path: "/admin/manager-evaluation", label: "تقييم المديرين", icon: "📊" },
    { path: "/admin/well-being", label: "الحالة اليومية", icon: "😊" },
    { path: "/admin/audit-logs", label: "سجلات التدقيق", icon: "🔒" },
    { path: "/admin/settings", label: "الإعدادات", icon: "⚙️" }
  ]
};

const Sidebar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const user = getStoredUser();
  const role = user?.role || 'employee';
  const items = [...(menuItems[role] || menuItems.employee)];

  const [payrollOpen, setPayrollOpen] = useState(false);

  // TEMP: Debug Auth
  useEffect(() => {
    console.log('Sidebar user:', user);
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/payroll')) {
      setPayrollOpen(true);
    }
  }, [location.pathname]);

  const [appLogo, setAppLogo] = useState(null);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    if (logo) setAppLogo(logo);
    const handleStorageChange = () => {
      const logo = localStorage.getItem(APP_LOGO_KEY);
      setAppLogo(logo || null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filteredPayroll = payrollSubItems.filter((item) => {
    if (role === 'admin') return true;
    if (role === 'manager') {
      return true;
    }
    return false;
  });

  const isNewsAuthorized = (() => {
    if (!user) return false;
    const dept = (user.department || '').trim().toLowerCase();
    return dept === 'news' || dept.includes('news') || dept.includes('إعلام');
  })();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg transition-all duration-300 ease-out z-40 overflow-y-auto">
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="h-10 w-auto rounded" />
            ) : (
              <img src="/logo-arabic.png" alt="Logo" className="h-10 w-auto" />
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">راديو الثورة</h1>
              {user?.department && (
                <p className="text-xs text-gray-500 truncate">{user.department}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {items.map((item, index) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/' && location.pathname === '') ||
                (item.path === '/employees' && location.pathname.startsWith('/admin/employees'));
              return (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    onClick={() => onToggleSidebar && onToggleSidebar()}
                    className={({ isActive: navActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                        isActive || navActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}

            {(role === 'manager' || role === 'admin') && (
              <>
                <li className="list-none">
                  <button
                    onClick={() => setPayrollOpen(!payrollOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                      location.pathname.startsWith('/payroll')
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">💰</span>
                    <span className="font-medium text-sm flex-1 text-right">الرواتب</span>
                    <span className={`text-xs transition-transform duration-200 ${payrollOpen ? 'rotate-90' : ''}`}>◀</span>
                  </button>
                </li>
                <ul className={`overflow-hidden transition-all duration-300 ease-in-out ${payrollOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  {filteredPayroll.map((sub, i) => {
                    const isActive = location.pathname === sub.path ||
                      (sub.path === '/payroll' && (location.pathname === '/payroll' || location.pathname === '/payroll/management'));
                    return (
                      <li key={i} className="mb-0.5">
                        <NavLink
                          to={sub.path}
                          onClick={() => onToggleSidebar && onToggleSidebar()}
                          className={({ isActive: navActive }) =>
                            `flex items-center gap-3 pr-4 pl-12 py-2.5 rounded-lg transition-all duration-150 text-sm ${
                              isActive || navActive
                                ? 'bg-primary bg-opacity-80 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`
                          }
                        >
                          <span className="text-lg flex-shrink-0">{sub.icon}</span>
                          <span className="font-medium">{sub.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {isNewsAuthorized && (
              <li className="list-none pt-2">
                <NavLink
                  to="/news"
                  onClick={() => onToggleSidebar && onToggleSidebar()}
                  className={({ isActive: navActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${
                      location.pathname === '/news' || navActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-xl flex-shrink-0">📰</span>
                  <span className="font-medium text-sm flex-1 text-right">لوحة الأخبار</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {user && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {user.profileImage ? (
                <img
                  src={user.profileImage.startsWith('http')
                    ? user.profileImage
                    : user.profileImage.startsWith('/uploads/')
                    ? user.profileImage
                    : `/uploads/${user.profileImage}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {user.name?.charAt(0) || 'م'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {role === 'admin' ? 'مدير عام' :
                   role === 'manager' ? `مدير ${user.department || ''}` :
                   'موظف'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;