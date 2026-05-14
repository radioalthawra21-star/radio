import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import { getUnreadCount } from '../../services/messageService';
import { playTaskAssignedSound, playRoleChangeSound, playNotificationSound, playMessageSound } from '../../utils/audioUtils';
import { formatDateTimeArabic } from '../../utils/dateUtils';

const showToast = (title, msg) => {
  const existing = document.getElementById('nt-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'nt-toast';
  t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#1a1a2e;color:#fff;padding:14px 24px;border-radius:12px;direction:rtl;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.3);max-width:420px;text-align:center;animation:ntFadeIn 0.3s ease;border:1px solid rgba(255,255,255,0.1)';
  t.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${title}</div><div style="opacity:0.8;font-size:13px">${msg}</div>`;
  if (!document.getElementById('nt-style')) {
    const s = document.createElement('style'); s.id = 'nt-style';
    s.textContent = '@keyframes ntFadeIn{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes ntFadeOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(-20px)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'ntFadeOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
};

const NotificationPanel = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const lastCountRef = useRef(null);
  const initialisedRef = useRef(false);

  useEffect(() => {
    fetchNotifications();
    checkNewMessages();
    const notificationInterval = setInterval(fetchNotifications, 10000);
    const messageInterval = setInterval(checkNewMessages, 10000);
    const handleNewNotification = () => setTimeout(fetchNotifications, 300);
    window.addEventListener('new-notification', handleNewNotification);
    return () => {
      clearInterval(notificationInterval);
      clearInterval(messageInterval);
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await getMyNotifications();
      if (response.success) {
        const newNotifications = response.data.notifications;
        const newUnreadCount = response.data.unreadCount;

        if (!initialisedRef.current) {
          lastCountRef.current = newUnreadCount;
          initialisedRef.current = true;
          setNotifications(newNotifications);
          setUnreadCount(newUnreadCount);
          localStorage.setItem('lastNotifications', JSON.stringify(newNotifications.slice(0, 10)));
          return;
        }

        const prevCount = lastCountRef.current;
        lastCountRef.current = newUnreadCount;
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);

        if (newUnreadCount > prevCount) {
          const latest = newNotifications[0];
          if (latest) {
            const stored = JSON.parse(localStorage.getItem('lastNotifications') || '[]');
            const isNew = !stored.find(n => n._id === latest._id);
            if (isNew) {
              const t = latest.title || 'إشعار جديد';
              const m = latest.message || '';
              if (latest.type === 'task_assigned') { playTaskAssignedSound(); showToast(t, m); }
              else if (latest.type === 'new_message') { playMessageSound(); showToast(t, m); }
              else if (latest.type === 'role_change' || latest.type === 'reward') { playRoleChangeSound(); showToast(t, m); }
              else { playNotificationSound(); showToast(t, m); }
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

  const checkNewMessages = async () => {
    try {
      const response = await getUnreadCount();
      if (response.success) {
        const newCount = response.data?.count || 0;
        if (newCount > messageUnreadCount) {
          playMessageSound();
          if (Notification.permission !== 'granted') {
            Notification.requestPermission();
          } else if (Notification.permission === 'granted') {
            new Notification('رسالة جديدة', { body: `لديك ${newCount} رسالة غير مقروءة`, icon: '/logo.png', tag: 'new-message' });
          }
        }
        setMessageUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Error checking messages:', error);
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

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification._id);
    const { type, relatedTask } = notification;
    switch (type) {
      case 'task_assigned':
      case 'task_completed':
      case 'task_evaluated':
      case 'task_approved':
      case 'task_rejected':
        if (relatedTask) navigate(`/task/${relatedTask}`);
        else navigate('/my-tasks');
        break;
      case 'reward': navigate('/admin/bonuses'); break;
      case 'new_user_registered': navigate('/admin/employees'); break;
      case 'new_message': navigate('/messages'); break;
      case 'role_change': navigate('/'); break;
      case 'leave_requested':
      case 'leave_cancelled': navigate('/manager/approve-leaves'); break;
      case 'leave_approved':
      case 'leave_rejected': navigate('/leave-request'); break;
      case 'leave_pending_gm':
      case 'leave_needs_gm': navigate('/admin/gm-approve-leaves'); break;
      case 'payroll': navigate('/payroll/comprehensive'); break;
      case 'recruitment': navigate('/admin/recruitment'); break;
      case 'performance': navigate('/admin/manager-evaluation'); break;
      case 'promotion': navigate('/admin/rankings'); break;
    }
    setShowNotifications(false);
  };

  return (
    <>
      <button
        onClick={() => navigate('/messages')}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="الرسائل"
      >
        <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {messageUnreadCount > 0 && (
          <span className="absolute -top-1 -left-1 bg-[#182E4E] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {messageUnreadCount}
          </span>
        )}
      </button>

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
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 animate-fade-in">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-dark">الإشعارات</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-sm text-interactive hover:underline">
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
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-secondary/10' : ''}`}
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
    </>
  );
};

export default NotificationPanel;
