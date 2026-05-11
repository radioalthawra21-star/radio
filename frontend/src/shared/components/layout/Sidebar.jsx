import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDepartments } from '../../../hooks/useDepartments';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

// Check if user is HR Department Head (رئيس قسم الموارد البشرية)
const isHRDepartmentHead = (user) => {
  if (!user) return false;
  // HR Department Head = manager role + HR department
  //常见的HR部门名称可能有多种写法
  const hrDepartmentKeywords = ['human resources', 'hr', 'موارد بشرية', 'الموارد البشرية', 'م/ب'];
  const departmentName = (user.department || '').toLowerCase();
  return user.role === 'manager' && hrDepartmentKeywords.some(keyword => departmentName.includes(keyword));
};

const menuItems = { employee: [ { path: "/", label: "لوحة التحكم", icon: "🏠" }, { path: "/my-tasks", label: "مهماتي", icon: "📋" }, { path: "/attendance", label: "الحضور والانصراف", icon: "📅" }, { path: "/leave-request", label: "طلب إجازة", icon: "📝" }, { path: "/employee/payroll", label: "رواتبي", icon: "💰" }, { path: "/messages", label: "الرسائل", icon: "✉️" }, { path: "/recruitment-performance", label: "التوظيف والأداء", icon: "📊" }, { path: "/evaluate-manager", label: "تقييم المدير", icon: "⭐" }, { path: "/well-being", label: "الحالة اليومية", icon: "😊" } ], manager: [ { path: "/", label: "لوحة التحكم", icon: "🏠" }, { path: "/add-task", label: "إضافة مهمة", icon: "➕" }, { path: "/manager/assign-tasks", label: "إسناد المهام", icon: "👥" }, { path: "/manager/evaluate-tasks", label: "تقييم المهام", icon: "⭐" }, { path: "/manager/reports", label: "تقارير القسم", icon: "📊" }, { path: "/admin/employees", label: "الموظفين", icon: "👤" }, { path: "/admin/attendance", label: "الحضور والانصراف", icon: "📅" }, { path: "/admin/leave-management", label: "إدارة الإجازات", icon: "📝" }, { path: "/admin/well-being", label: "الحالة اليومية", icon: "😊" }, { path: "/payroll", label: "الرواتب", icon: "💰" }, { path: "/recruitment-performance", label: "التوظيف والأداء", icon: "📊" } ], admin: [ { path: "/", label: "لوحة التحكم", icon: "🏠" }, { path: "/admin/assign-tasks", label: "إسناد المهام", icon: "👥" }, { path: "/admin/employees", label: "الموظفين", icon: "👤" }, { path: "/admin/reports", label: "التقارير", icon: "📊" }, { path: "/admin/bonuses", label: "المكافآت", icon: "🎁" }, { path: "/admin/attendance", label: "الحضور والانصراف", icon: "📅" }, { path: "/admin/leave-management", label: "إدارة الإجازات", icon: "📝" }, { path: "/admin/manager-evaluation", label: "تقييم المديرين", icon: "📊" }, { path: "/admin/well-being", label: "الحالة اليومية", icon: "😊" }, { path: "/payroll", label: "الرواتب", icon: "💰" }, { path: "/recruitment-performance", label: "التوظيف والأداء", icon: "📊" }, { path: "/admin/settings", label: "الإعدادات", icon: "⚙️" } ] };

const Sidebar = ({ isOpen, setIsOpen, user }) => {
  const role = user?.role || 'employee';
  const items = menuItems[role] || menuItems.employee;
  const [appLogo, setAppLogo] = useState(null);
  const [departments, setDepartments] = useState([]);
  const { getDepartmentName, departments: allDepartments } = useDepartments();
  const navigate = useNavigate();
  
  // Filter items based on HR Department Head restriction
  const filteredItems = items.filter(item => {
    // HR-only menu items (visible only to HR Department Head)
    const hrOnlyItems = [
      '/attendance',
      '/leave-request',
      '/payroll',
      '/recruitment-performance',
      '/admin/attendance',
      '/admin/leave-management',
      '/admin/well-being'  // optionally HR only
    ];
    
    // If item is HR-only, check if user is HR Department Head
    if (hrOnlyItems.includes(item.path)) {
      return isHRDepartmentHead(user);
    }
    
    return true; // Show all other items
  });
   
  useEffect(() => {
    if (allDepartments) {
      setDepartments(allDepartments);
    }
  }, [allDepartments]);

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

  return (
    <aside className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ease-out z-40 ${isOpen ? 'w-64' : ''}`}>
      <div className="h-full flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="h-10 w-auto" />
            ) : (
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            )}
            <div>
              <h1 className="text-lg font-bold text-dark">راديو الثورة</h1>
              {user?.department && (
                <p className="text-xs text-gray-500">{getDepartmentName(user.department)}</p>
              )}
            </div>
          </div>
        </div>
          
        {/* Navigation */}
        <nav>
          <ul className="space-y-2">
            {filteredItems.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
{user.profileImage ? (
  <img
    src={
      user.profileImage.startsWith('http')
        ? user.profileImage
        : user.profileImage.startsWith('/uploads/')
        ? user.profileImage
        : `/uploads/${user.profileImage}`
    }
    alt={user.name}
    className="w-10 h-10 rounded-full object-cover"
  />
) : (
  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
    {user.name?.charAt(0) || 'م'}
  </div>
)}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-dark truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {role === 'admin' ? 'المدير العام' : 
                   role === 'manager' ? `مدير ${getDepartmentName(user.department)}` : 
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
