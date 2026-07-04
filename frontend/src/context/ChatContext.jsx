import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';
import { getStoredUser } from '../services/authService';
import { playMessageSound } from '../utils/audioUtils';

const ChatContext = createContext(null);

const SOCKET_URL = API_BASE_URL || '';

export const ChatProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [presenceMap, setPresenceMap] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeouts = useRef({});
  const isMounted = useRef(true);

  const userRef = useRef(getStoredUser());

  useEffect(() => {
    isMounted.current = true;
    const token = localStorage.getItem('token');
    if (!token || !userRef.current) return;

    const socketInstance = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      if (isMounted.current) setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      if (isMounted.current) setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Chat socket error:', err.message);
      if (isMounted.current) setConnected(false);
    });

    socketInstance.on('presence:update', ({ userId, status }) => {
      if (isMounted.current) {
        setPresenceMap(prev => ({ ...prev, [userId]: { status, lastSeen: new Date() } }));
      }
    });

    socketInstance.on('chat:typing', ({ chatId, userId: typingUserId, isTyping }) => {
      if (!isMounted.current || typingUserId === userRef.current?._id) return;
      setTypingUsers(prev => {
        const key = `${chatId}:${typingUserId}`;
        if (isTyping) {
          return { ...prev, [key]: true };
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (isTyping) {
        if (typingTimeouts.current[`${chatId}:${typingUserId}`]) {
          clearTimeout(typingTimeouts.current[`${chatId}:${typingUserId}`]);
        }
        typingTimeouts.current[`${chatId}:${typingUserId}`] = setTimeout(() => {
          if (isMounted.current) {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[`${chatId}:${typingUserId}`];
              return next;
            });
          }
        }, 3000);
      }
    });

    socketInstance.on('notification', (notification) => {
      if (!isMounted.current) return;
      if (notification?.type === 'CHAT_MESSAGE' || notification?.type === 'CHAT_MENTION') {
        playMessageSound();
      }
    });

    socketInstance.on('chat:lockToggled', ({ chatId, isLocked }) => {
      if (!isMounted.current) return;
      window.dispatchEvent(new CustomEvent('chat-lock-toggled', { detail: { chatId, isLocked } }));
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      isMounted.current = false;
      Object.values(typingTimeouts.current).forEach(t => clearTimeout(t));
      socketInstance.off('notification');
      if (socketInstance.connected) {
        socketInstance.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  const joinChat = useCallback((chatId) => {
    socketRef.current?.emit('chat:join', chatId);
  }, []);

  const sendMessage = useCallback((data, callback) => {
    socketRef.current?.emit('chat:send', data, callback);
  }, []);

  const emitTyping = useCallback((chatId, isTyping) => {
    socketRef.current?.emit('chat:typing', { chatId, isTyping });
  }, []);

  const markAsRead = useCallback((chatId, messageId) => {
    socketRef.current?.emit('chat:markRead', { chatId, messageId });
  }, []);

  const editMessage = useCallback((data, callback) => {
    socketRef.current?.emit('chat:edit', data, callback);
  }, []);

  const deleteMessage = useCallback((data, callback) => {
    socketRef.current?.emit('chat:delete', data, callback);
  }, []);

  const contextValue = useMemo(() => ({
    socket,
    connected,
    activeChat,
    setActiveChat,
    presenceMap,
    typingUsers,
    joinChat,
    sendMessage,
    emitTyping,
    markAsRead,
    editMessage,
    deleteMessage
  }), [socket, connected, activeChat, presenceMap, typingUsers]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    return {
      socket: null, connected: false, activeChat: null, setActiveChat: () => {},
      presenceMap: {}, typingUsers: {}, joinChat: () => {},
      sendMessage: () => {}, emitTyping: () => {}, markAsRead: () => {},
      editMessage: () => {}, deleteMessage: () => {}
    };
  }
  return context;
};
