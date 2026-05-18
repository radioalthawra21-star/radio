import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';
import {
  playNotificationSound, playTaskAssignedSound, playMessageSound, playRoleChangeSound,
  playLeaveRequestedSound, playLeaveApprovedSound, playLeaveRejectedSound, playLeaveCancelledSound,
} from '../utils/audioUtils';

const SocketContext = createContext(null);

const SOCKET_URL = API_BASE_URL || 'http://127.0.0.1:3000';

const showToast = (title, message) => {
  const existing = document.getElementById('nt-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'nt-toast';
  toast.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 99999; background: #1a1a2e; color: #fff;
    padding: 14px 24px; border-radius: 12px; direction: rtl;
    font-family: system-ui, sans-serif; font-size: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    max-width: 420px; text-align: center;
    animation: ntFadeIn 0.3s ease;
    border: 1px solid rgba(255,255,255,0.1);
  `;
  toast.innerHTML = `
    <div style="font-weight:600;margin-bottom:4px">${title}</div>
    <div style="opacity:0.8;font-size:13px">${message}</div>
  `;

  const style = document.getElementById('nt-style');
  if (!style) {
    const newStyle = document.createElement('style');
    newStyle.id = 'nt-style';
    newStyle.textContent = `
      @keyframes ntFadeIn { from { opacity:0; transform:translateX(-50%) translateY(-20px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
      @keyframes ntFadeOut { from { opacity:1 } to { opacity:0; transform:translateX(-50%) translateY(-20px) } }
    `;
    document.head.appendChild(newStyle);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'ntFadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const isMountedRef = useRef(true);
  const cleanupRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    const token = localStorage.getItem('token');
    if (!token) return;

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
      if (isMountedRef.current) setConnected(false);
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      if (isMountedRef.current) setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      if (isMountedRef.current) setConnected(false);
    });

    const handleNotification = (notification) => {
      if (!isMountedRef.current) return;

      const notifType = notification?.type;
      const title = notification?.title || 'إشعار جديد';
      const message = notification?.message || '';

      switch (notifType) {
        case 'leave_requested':
        case 'leave_needs_gm':
          playLeaveRequestedSound();
          break;
        case 'leave_pending_gm':
        case 'leave_approved':
          playLeaveApprovedSound();
          break;
        case 'leave_cancelled':
          playLeaveCancelledSound();
          break;
        case 'leave_rejected':
          playLeaveRejectedSound();
          break;
        case 'task_assigned':
          playTaskAssignedSound();
          break;
        case 'new_message':
          playMessageSound();
          break;
        case 'role_change':
        case 'reward':
          playRoleChangeSound();
          break;
        default:
          playNotificationSound();
      }

      showToast(title, message);
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    };

    socketInstance.on('notification', handleNotification);

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    const cleanup = () => {
      isMountedRef.current = false;
      socketInstance.off('notification', handleNotification);
      socketInstance.off('connect_error');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      if (socketInstance.connected) {
        socketInstance.disconnect();
      }
      socketRef.current = null;
    };

    cleanupRef.current = cleanup;

    return cleanup;
  }, []);

  const contextValue = useMemo(() => ({ socket, connected }), [socket, connected]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('⚠️ useSocket must be used within SocketProvider');
    return { socket: null, connected: false };
  }
  return context;
};
