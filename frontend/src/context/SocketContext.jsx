import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';
import {
  playNotificationSound, playTaskAssignedSound, playMessageSound, playRoleChangeSound,
  playLeaveRequestedSound, playLeaveApprovedSound, playLeaveRejectedSound, playLeaveCancelledSound,
} from '../utils/audioUtils';

const SocketContext = createContext(null);

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

  const style = document.createElement('style');
  style.id = 'nt-style';
  style.textContent = `
    @keyframes ntFadeIn { from { opacity:0; transform:translateX(-50%) translateY(-20px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
    @keyframes ntFadeOut { from { opacity:1 } to { opacity:0; transform:translateX(-50%) translateY(-20px) } }
  `;
  if (!document.getElementById('nt-style')) document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'ntFadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(API_BASE_URL || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('notification', (notification) => {
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
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
