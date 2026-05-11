import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import { getUnreadCount } from '../services/messageService';
import { getWellBeingStatus } from '../services/wellBeingService';
import { uploadProfileImage, logout as authLogout } from '../services/authService';
import { UPLOADS_URL } from '../services/api';
import { playTaskAssignedSound, playMessageSound } from '../utils/audioUtils';
import { formatDateTimeArabic } from '../utils/dateUtils';

const Navbar = ({ onToggleSidebar, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const [appLogo, setAppLogo] = useState(null);
  const [appName] = useState(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [showWellBeingReminder, setShowWellBeingReminder] = useState(false);
  const [dismissedReminder, setDismissedReminder] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const logo = localStorage.getItem('appLogo');
    const name = localStorage.getItem('appName');
    if (logo) setAppLogo(logo);
    if (name) localStorage.setItem('appName', name);

    const handleStorageChange = () => {
      const logo = localStorage.getItem('appLogo');
      const name = localStorage.getItem('appName');
      setAppLogo(logo || null);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appBrandingUpdate', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appBrandingUpdate', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      checkWellBeingStatus();
    }
    fetchNotifications();
    checkNewMessages();
    const notificationInterval = setInterval(fetchNotifications, 30000);
    const messageInterval = setInterval(checkNewMessages, 15000);
    return () => {
      clearInterval(notificationInterval);
      clearInterval(messageInterval);
    };
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const response = await getMyNotifications();
      if (response?.success) {
        const newNotifications = response.data.notifications || [];
        const newUnreadCount = response.data.unreadCount || 0;
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
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

  const checkNewMessages = async () => {
    try {
      const response = await getUnreadCount();
      if (response?.success) {
        const newCount = response.data?.count || 0;
        if (newCount > messageUnreadCount) {
          playMessageSound();
          if (Notification.permission === 'granted') {
            new Notification('رسالة جديدة', {
              body: `لديك ${newCount} رسالة غير مقروءة`,
              icon: '/logo-arabic.png',
              tag: 'new-message'
            });
          }
        }
        setMessageUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  };

  const checkWellBeingStatus = async () => {
    try {
      const stored = localStorage.getItem('wellBeingDismissedDate');
      const today = new Date().toDateString();
      if (stored === today) return;
      const response = await getWellBeingStatus();
      if (response?.success && !response.data.hasSubmitted) {
        if (!dismissedReminder) {
          setShowWellBeingReminder(true);
        }
      }
    } catch (error) {
      console.error('Error checking well-being:', error);
    }
  };

  const dismissWellBeingReminder = () => {
    localStorage.setItem('wellBeingDismissedDate', new Date().toDateString());
    setShowWellBeingReminder(false);
    setDismissedReminder(true);
    playMessageSound();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification._id);
    const { type, relatedTask, relatedUser } = notification;
    switch (type) {
      case 'task_assigned':
      case 'task_completed':
      case 'task_evaluated':
      case 'task_approved':
      case 'task_rejected':
        if (relatedTask) {
          navigate(`/tasks/${relatedTask}`);
        } else {
          navigate(currentUser?.role === 'employee' ? '/my-tasks' : '/manager/evaluate-tasks');
        }
        break;
      case 'reward':
        navigate('/bonus');
        break;
      case 'role_change':
        break;
      case 'new_user_registered':
        navigate('/employees');
        break;
      case 'new_message':
        navigate('/messages');
        break;
      default:
        break;
    }
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      onLogout?.();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleLabel = () => {
    if (!currentUser) return '';
    if (currentUser.role === 'admin') return 'المدير العام';
    if (currentUser.role === 'manager') return `مدير ${currentUser.department || ''}`;
    return 'موظف';
  };

  const displayName = appName || 'راديو الثورة';

  return (
    <>
      {showWellBeingReminder && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">😊</span>
            <span className="font-medium">تقرير الحالة اليومية - كيف تشعر اليوم؟</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/well-being')}
              className="px-4 py-1.5 bg-white text-blue-700 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm"
            >
              إكمال الآن
            </button>
            <button
              onClick={dismissWellBeingReminder}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="ترحيل الذكرى"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:flex"
            title="تبديل القائمة الجانبية"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="h-9 w-auto hidden md:block" />
            ) : (
              <img src="/logo-arabic.png" alt="Logo" className="h-9 w-auto hidden md:block" />
            )}
            <h2 className="text-lg font-bold text-gray-900 hidden md:inline-block">{displayName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => navigate('/messages')}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors" 
            title="الرسائل"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {messageUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {messageUnreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="الإشعارات"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="p-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 text-sm">الإشعارات</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs text-blue-600 hover:underline">
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">لا توجد إشعارات</p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 border-b hover:bg-gray-50 cursor-pointer text-sm ${!notification.isRead ? 'bg-blue-50' : ''}`}
                      >
                        <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{notification.message}</p>
                        <p className="text-gray-400 text-xs mt-1 en-num">{formatDateTimeArabic(notification.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
              >
                {currentUser?.profileImage ? (
                  <img
                    src={currentUser.profileImage.startsWith('http')
                      ? currentUser.profileImage
                      : currentUser.profileImage.startsWith('/uploads/')
                      ? currentUser.profileImage
                      : `${UPLOADS_URL}${currentUser.profileImage}`}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {currentUser?.name?.charAt(0) || 'م'}
                  </div>
                )}
                <svg className="w-4 h-4 text-gray-500 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="p-3 border-b">
                  <p className="font-semibold text-gray-900 text-sm truncate">{currentUser?.name}</p>
                  <p className="text-gray-500 text-xs">{getRoleLabel()}</p>
                </div>
                <div className="py-1">
                  <button onClick={() => { navigate('/change-password'); setShowUserMenu(false); }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    تغيير كلمة المرور
                  </button>
                  <button onClick={handleLogout}
                    className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;