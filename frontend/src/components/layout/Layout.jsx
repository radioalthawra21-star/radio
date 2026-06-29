/**
 * Layout Component
 * Main layout wrapper with sidebar and navbar
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { getStoredUser } from '../../services/authService';
import { ChatWidget } from '../../pages/Chat/ChatPage';
import api from '../../services/api';
import DailyReportReminder from './DailyReportReminder';
import { useLocation } from 'react-router-dom';

const FloatingChatButton = ({ onClick }) => {
  const btnRef = useRef(null);
  const dragState = useRef({ startX: 0, startY: 0, left: 0, top: 0, dragging: false, moved: false });
  const [unread, setUnread] = useState(0);
  const posRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('chatFabPos');
    if (saved) { try { const p = JSON.parse(saved); if (p && typeof p.x === 'number') posRef.current = p; } catch {} }
  }, []);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/chat/unread');
        if (res.data.success) setUnread(res.data.data.total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const onPointerDown = useCallback((e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = {
      startX: clientX, startY: clientY,
      left: rect.left, top: rect.top,
      dragging: true, moved: false
    };
  }, []);

  useEffect(() => {
    if (!dragState.current.dragging) return;
    const onMove = (e) => {
      const s = dragState.current;
      if (!s.dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - s.startX;
      const dy = clientY - s.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.moved = true;
      if (!s.moved) return;
      const btn = btnRef.current;
      if (!btn) return;
      const x = Math.max(0, Math.min(window.innerWidth - 56, s.left + dx));
      const y = Math.max(0, Math.min(window.innerHeight - 56, s.top + dy));
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    };
    const onUp = () => {
      const s = dragState.current;
      if (s.moved && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        posRef.current = { x: r.left, y: r.top };
        localStorage.setItem('chatFabPos', JSON.stringify(posRef.current));
      }
      s.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const handleClick = () => {
    if (dragState.current.moved) { dragState.current.moved = false; return; }
    onClick();
  };

  return (
    <button
      ref={btnRef}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onClick={handleClick}
      className="fixed z-[55] flex items-center justify-center w-14 h-14 rounded-full bg-[#182E4E] text-white shadow-lg hover:bg-[#152842] active:scale-95 transition-transform select-none touch-none"
      style={posRef.current ? {
        left: posRef.current.x,
        top: posRef.current.y,
      } : {
        left: 'auto',
        right: 'max(12px, min(24px, calc(100vw - 56px)))',
        bottom: 24,
      }}
      title="المحادثات"
      aria-label="فتح المحادثات"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
};

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const chatPanelRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const chatDragState = useRef({ startX: 0, startY: 0, x: 0, y: 0, dragging: false, moved: false });

  // Drag handlers for chat panel
  const onChatPanelPointerDown = useCallback((e) => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (e.target.closest('button, a, input, textarea, select')) return;

    const rect = panel.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    chatDragState.current = {
      startX: clientX,
      startY: clientY,
      x: rect.left,
      y: rect.top,
      dragging: true,
      moved: false
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!chatDragState.current.dragging) return;

    const onMove = (e) => {
      const s = chatDragState.current;
      if (!s.dragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - s.startX;
      const dy = clientY - s.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.moved = true;
      if (!s.moved) return;

      const panel = chatPanelRef.current;
      if (!panel) return;

      const newX = s.x + dx;
      const newY = s.y + dy;

      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      const constrainedX = Math.max(0, Math.min(maxX, newX));
      const constrainedY = Math.max(0, Math.min(maxY, newY));

      panel.style.left = constrainedX + 'px';
      panel.style.top = constrainedY + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.maxWidth = isMobile ? '100%' : '672px';
    };

    const onUp = () => {
      chatDragState.current.dragging = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isMobile]);

  // Close chat panel on navigation on mobile
  useEffect(() => {
    if (isMobile) setChatOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={currentUser}
        onToggleChat={() => setChatOpen(v => !v)}
        isMobile={isMobile}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen && !isMobile ? 'md:mr-64' : ''}`}>
        <Navbar user={currentUser} onLogout={onLogout} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-3 md:p-6">
          {children}
        </main>
      </div>

      <DailyReportReminder />
      <FloatingChatButton onClick={() => setChatOpen(v => !v)} />

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setChatOpen(false)} />
          <div
            ref={chatPanelRef}
            onPointerDown={onChatPanelPointerDown}
            className="relative w-full md:max-w-2xl md:h-full bg-white shadow-2xl overflow-hidden animate-slideUp md:animate-slideInLeft rounded-t-2xl md:rounded-none cursor-move touch-none select-none"
            dir="rtl"
            style={{ maxHeight: isMobile ? '85vh' : undefined }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10 cursor-move select-none" onPointerDown={onChatPanelPointerDown}>
              <h3 className="font-bold text-gray-800">المحادثات</h3>
              <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="إغلاق">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-full" style={{ height: isMobile ? 'calc(85vh - 56px)' : undefined }}>
              <ChatWidget />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;