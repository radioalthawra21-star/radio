import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';

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
    { path: '/daily-report', label: 'التقرير اليومي', icon: '📋' },
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
    { path: '/daily-report', label: 'التقرير اليومي', icon: '📋' },
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
    { path: '/admin/supervisor', label: 'Temp-Supervisor', icon: '🔬' },
    { path: '/admin/bonuses', label: 'المكافآت', icon: '🎁' },
    { path: '/admin/well-being', label: 'الحالة اليومية', icon: '😊' },
    { path: '/daily-report', label: 'التقرير اليومي', icon: '📋' },
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
    { path: '/daily-report', label: 'التقرير اليومي', icon: '📋' },
    { path: '/admin/settings', label: 'الإعدادات', icon: '⚙️' },
    { path: '/payroll', label: 'لوحة الرواتب', icon: '💰' },
    { path: '/admin/leave-management', label: 'إدارة الإجازات', icon: '📝' },
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

const isNewsAuthorized = (user) => {
  if (!user) return false;
  const dept = (user.department || '').trim().toLowerCase();
  return dept === 'news' || dept === 'الأخبار' || dept === 'تحرير' || dept.includes('news') || dept.includes('إعلام') || dept.includes('تحرير');
};

const Sidebar = ({ isOpen, setIsOpen, user, onToggleChat, isMobile }) => {
  const role = user?.role || 'employee';
  const username = user?.username || '';
  const userDept = (user?.department || '').toString().toLowerCase().trim();
  const isHrEmployee = role === 'employee' && (userDept === 'hr' || userDept === 'الموارد البشرية' || userDept.includes('موارد بشرية'));
  let items = menuItems[role] || menuItems.employee;
  const location = useLocation();

  if (role === 'employee' && !isHrEmployee) {
    items = items.filter(item => !['/admin/supervisor', '/admin/holidays'].includes(item.path));
  }

  const newsAuthorized = isNewsAuthorized(user);
  const [appLogo, setAppLogo] = useState(null);
  const sidebarRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile && isOpen) {
      const scrollY = window.scrollY;
      document.documentElement.dataset.scrollY = String(scrollY);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      window.scrollTo(0, scrollY);
    } else {
      const saved = parseInt(document.documentElement.dataset.scrollY || '0', 10);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (saved > 0) window.scrollTo(0, saved);
      delete document.documentElement.dataset.scrollY;
    }
    return () => {
      const saved = parseInt(document.documentElement.dataset.scrollY || '0', 10);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (saved > 0) window.scrollTo(0, saved);
      delete document.documentElement.dataset.scrollY;
    };
  }, [isOpen, isMobile]);

  // Close sidebar on navigation for mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && isMobile) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isMobile]);

  // Diagnostic: visualViewport + parent elements + Sidebar rect
  useEffect(() => {
    const vv = window.visualViewport;
    const logDiagnostics = () => {
      if (!(process.env.NODE_ENV === 'development' || window.__SIDEBAR_DEBUG)) return;
      console.group('%c🔍 Sidebar Zoom Diagnostics', 'font-size:16px; font-weight:bold; color:#CD6F13');
      console.log(`layout viewport: ${window.innerWidth}x${window.innerHeight}`);
      if (vv) {
        console.log(`visualViewport: ${vv.width}x${vv.height}`);
        console.log(`visualViewport.offsetLeft: ${vv.offsetLeft}`);
        console.log(`visualViewport.offsetTop: ${vv.offsetTop}`);
        console.log(`visualViewport.scale: ${vv.scale}`);
      } else {
        console.log('visualViewport API غير مدعوم');
      }
      const sidebar = sidebarRef.current;
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        console.log('sidebar getBoundingClientRect:', rect);
        console.log('sidebar offsetLeft:', sidebar.offsetLeft);
        console.log('sidebar offsetTop:', sidebar.offsetTop);
        console.log('sidebar style.right:', sidebar.style.right);
        console.log('sidebar style.transform:', sidebar.style.transform);
        console.log('sidebar computed right:', getComputedStyle(sidebar).right);
      }
      // فحص العناصر الأب
      let el = sidebarRef.current?.parentElement;
      let level = 0;
      while (el && level < 5) {
        const style = getComputedStyle(el);
        const t = style.transform;
        console.log(`[${level}] ${el.tagName}${el.id ? '#' + el.id : ''} transform:${t !== 'none' ? '⚠️'+t : '✓'} zoom:${style.zoom !== '1' && style.zoom ? '⚠️'+style.zoom : '✓'}`);
        el = el.parentElement;
        level++;
      }
      console.groupEnd();
    };
    logDiagnostics();
    // مراقبة تغيرات visualViewport أثناء Zoom
    if (vv) {
      const onVvChange = () => { if (isOpen) logDiagnostics(); };
      vv.addEventListener('resize', onVvChange);
      vv.addEventListener('scroll', onVvChange);
      return () => { vv.removeEventListener('resize', onVvChange); vv.removeEventListener('scroll', onVvChange); };
    }
  }, [isOpen]);

  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!isOpen || !isMobile) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Prevent page scroll while swiping sidebar
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
    }
    // Any horizontal swipe past threshold closes the sidebar
    if (Math.abs(dx) > 30) {
      setIsOpen(false);
    }
  };

  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile, setIsOpen]);

  const sidebarContent = (
    <>
{isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-[58] animate-fade-in touch-none"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-screen text-white z-[59] ${
          isOpen ? 'shadow-2xl' : ''
        } ${isMobile ? 'w-72 animate-slideInLeft' : 'w-64'}`}
        style={{
          backgroundColor: '#182E4E',
          touchAction: isMobile ? 'manipulation' : 'auto',
          ...(isMobile ? { right: '0px', transform: 'none', translate: 'none' } : {}),
        }}
        role="navigation"
        aria-label="القائمة الجانبية"
        aria-hidden={!isOpen}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="h-10 md:h-12" style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <img src="/logo.png" alt="Logo" className="h-10 md:h-12" style={{ filter: 'brightness(0) invert(1)' }} />
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="إغلاق القائمة"
                aria-label="إغلاق القائمة"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
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
                  onClick={() => { onToggleChat(); handleNavClick(); }}
                  className="flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors w-full text-right hover:bg-gray-700 text-gray-300 min-h-[48px]"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                      isActive 
                        ? 'bg-interactive text-white' 
                        : 'hover:bg-gray-700 text-gray-300'
                    }`
                  }
                  aria-current={({ isActive }) => isActive ? 'page' : undefined}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              )
          ))}

            {newsAuthorized && (
              <>
                <div className="border-t border-gray-600 my-2"></div>
                <NavLink
                  key="/news"
                  to="/news"
                  onClick={handleNavClick}
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
                    onClick={handleNavClick}
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
                    onClick={handleNavClick}
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
                      onClick={handleNavClick}
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

  return isOpen ? createPortal(sidebarContent, document.body) : null;
};

export default Sidebar;