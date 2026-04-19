import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import { uploadProfileImage } from '../../services/authService';
import { playTaskAssignedSound, playRoleChangeSound, playNotificationSound } from '../../utils/audioUtils';
import { formatDateTimeArabic } from '../../utils/dateUtils';

const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const departmentNames = {
  production: 'الإنتاج',
  news: 'الأخبار',
  marketing: 'التسويق'
};

const Navbar = ({ user, onLogout, onToggleSidebar }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const [appLogo, setAppLogo] = useState(null);
  const [appName, setAppName] = useState(null);

  useEffect(() => {
    const logo = localStorage.getItem(APP_LOGO_KEY);
    const name = localStorage.getItem(APP_NAME_KEY);
    if (logo) setAppLogo(logo);
    if (name) setAppName(name);

    const handleStorageChange = () => {
      const logo = localStorage.getItem(APP_LOGO_KEY);
      const name = localStorage.getItem(APP_NAME_KEY);
      setAppLogo(logo || null);
      setAppName(name || null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appBrandingUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appBrandingUpdate', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await getMyNotifications();
      if (response.success) {
        const previousUnreadCount = unreadCount;
        const newNotifications = response.data.notifications;
        const newUnreadCount = response.data.unreadCount;
        
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        
        if (newUnreadCount > 0 && newUnreadCount !== previousUnreadCount) {
          const latestNotification = newNotifications[0];
          if (latestNotification) {
            const storedNotifications = JSON.parse(localStorage.getItem('lastNotifications') || '[]');
            const isNew = !storedNotifications.find(n => n._id === latestNotification._id);
            
            if (isNew || storedNotifications.length === 0) {
              if (latestNotification.type === 'task_assigned') {
                playTaskAssignedSound();
              } else if (latestNotification.type === 'role_change' || latestNotification.type === 'reward') {
                playRoleChangeSound();
              } else {
                playNotificationSound();
              }
            }
          }
        }
        
        localStorage.setItem('lastNotifications', JSON.stringify(newNotifications.slice(0, 10)));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await uploadProfileImage(formData);
      if (response.success) {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        storedUser.profileImage = response.data.user.profileImage;
        localStorage.setItem('user', JSON.stringify(storedUser));
        if (user) {
          user.profileImage = response.data.user.profileImage;
        }
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
    }
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'المدير العام';
    if (user.role === 'manager') return `مدير ${departmentNames[user.department] || ''}`;
    return 'موظف';
  };

  const displayName = appName || 'راديو الثورة';

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="h-10 w-auto" />
          ) : (
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          )}
          <h2 className="text-xl font-bold text-dark">{displayName}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-error text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
              <div className="p-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-dark">الإشعارات</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-interactive hover:underline"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">لا توجد إشعارات</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => {
                        handleMarkAsRead(notification._id);
                        navigate(`/task/${notification.relatedTask || ''}`);
                      }}
                      className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                        !notification.isRead ? 'bg-secondary/10' : ''
                      }`}
                    >
                      <p className="font-semibold text-sm text-dark">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1 en-num">{formatDateTimeArabic(notification.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={user?.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0) || 'م'}
                  </div>
                )}
                <span className="text-dark font-medium">{user?.name}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <label className="absolute bottom-0 right-8 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
              <div className="p-3 border-b">
                <p className="font-semibold text-dark">{user?.name}</p>
                <p className="text-sm text-gray-500">{getRoleLabel()}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={onLogout}
                  className="w-full text-right p-2 hover:bg-gray-100 rounded-lg text-error"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;