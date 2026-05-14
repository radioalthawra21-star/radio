import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/payroll/management', emoji: '📋', label: 'إدارة الرواتب' },
  { to: '/payroll/processing', emoji: '⚙️', label: 'معالجة الرواتب' },
  { to: '/payroll/reports', emoji: '📊', label: 'تقارير الرواتب' },
  { to: '/payroll/audit', emoji: '🔍', label: 'تدقيق الرواتب' },
  { to: '/payroll/pending', emoji: '⏳', label: 'الرواتب المعلقة' },
  { to: '/payroll/policies', emoji: '📋', label: 'سياسات الرواتب' },
];

const DashboardQuickMenu = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`p-2.5 rounded-lg transition-all duration-200 ${
          menuOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        aria-label="القائمة"
      >
        <span className={`text-xl block transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`}>☰</span>
      </button>
      <div
        className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 transition-all duration-300 ease-in-out transform origin-top-right ${
          menuOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
        }`}
      >
        <div className="px-3 pb-2 mb-1 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الانتقال السريع</p>
        </div>
        {links.map(({ to, emoji, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 text-sm transition-all duration-150 mx-1 rounded-lg ${
                isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="ml-3 text-lg">{emoji}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default DashboardQuickMenu;
