import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatMessages } from '../../services/chatService';
import { useChat } from '../../context/ChatContext';
import { getStoredUser } from '../../services/authService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const ChatMessages = ({ chat, onToggleDetails, onMessageSent, onBack }) => {
  const { socket, typingUsers, joinChat, markAsRead } = useChat();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liveLocked, setLiveLocked] = useState(chat?.isLocked || false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const user = getStoredUser();
  const isInitialLoad = useRef(true);

  const liveChat = chat ? { ...chat, isLocked: liveLocked } : chat;

  useEffect(() => {
    if (chat?._id) {
      joinChat(chat._id);
      loadMessages();
      setLiveLocked(chat.isLocked || false);
    }
    return () => {
      setMessages([]);
      isInitialLoad.current = true;
    };
  }, [chat?._id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail.chatId === chat?._id) {
        setLiveLocked(e.detail.isLocked);
      }
    };
    window.addEventListener('chat-lock-toggled', handler);
    return () => window.removeEventListener('chat-lock-toggled', handler);
  }, [chat?._id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await getChatMessages(chat._id);
      if (res.success) {
        setMessages(res.data.messages);
        setHasMore(res.data.hasMore);
        const latest = res.data.messages?.[res.data.messages.length - 1];
        if (latest) markAsRead(chat._id, latest._id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[0]?._id;
      const res = await getChatMessages(chat._id, { before: oldestId });
      if (res.success) {
        setMessages(prev => [...res.data.messages, ...prev]);
        setHasMore(res.data.hasMore);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    if (isInitialLoad.current && !loading) {
      scrollToBottom();
      isInitialLoad.current = false;
    }
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.chat !== chat?._id) return;
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      markAsRead(chat._id, message._id);
      onMessageSent?.();
    };

    const handleEdited = ({ messageId, content, editedAt }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, content, isEdited: true, editedAt } : m
      ));
    };

    const handleDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, isDeleted: true, deletedAt: new Date() } : m
      ));
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:edited', handleEdited);
    socket.on('chat:deleted', handleDeleted);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:edited', handleEdited);
      socket.off('chat:deleted', handleDeleted);
    };
  }, [socket, chat?._id, scrollToBottom, markAsRead, onMessageSent]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || !hasMore || loadingMore) return;
    if (el.scrollTop < 100) {
      const prevScrollHeight = el.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight - prevScrollHeight;
          }
        });
      });
    }
  }, [hasMore, loadingMore, loadMore]);

  const getChatTitle = () => {
    if (chat.name) return chat.name;
    if (chat.type === 'task' && chat.taskId) return chat.taskId.title || 'مهمة';
    if (chat.departments?.length) return chat.departments.map(d => d.name).join(' + ');
    return 'محادثة';
  };

  const getChatSubtitle = () => {
    if (chat.type === 'department') return 'محادثة القسم';
    if (chat.type === 'task') return `#${chat.taskId?._id?.slice(-4) || ''}`;
    if (chat.type === 'shared') return 'محادثة مشتركة';
    return '';
  };

  const chatTypingKey = `${chat?._id}:${user?._id}`;
  const isSomeoneTyping = Object.keys(typingUsers).some(
    key => key.startsWith(`${chat?._id}:`) && key !== chatTypingKey
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-3 flex items-center justify-between flex-shrink-0 relative z-10">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="العودة للقائمة"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#182E4E] flex items-center justify-center text-white text-sm flex-shrink-0">
            {chat.type === 'task' ? '📋' : chat.type === 'shared' ? '🔗' : '💬'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate">{getChatTitle()}</h3>
            <p className="text-xs text-gray-500 truncate">{getChatSubtitle()}</p>
          </div>
        </div>
        <button
          onClick={onToggleDetails}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          title="تفاصيل المحادثة"
          aria-label="تفاصيل المحادثة"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#182E4E]"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">لا توجد رسائل بعد</p>
            <p className="text-xs mt-1">كن أول من يرسل رسالة</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center py-2">
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#182E4E] mx-auto"></div>
                ) : (
                  <button
                    onClick={loadMore}
                    className="text-xs text-[#182E4E] hover:underline"
                  >
                    تحميل المزيد
                  </button>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg._id || i}>
                {i > 0 && new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString() && (
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                      {new Date(msg.createdAt).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                <ChatMessage message={msg} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {isSomeoneTyping && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-xs">يكتب...</span>
          </div>
        )}
      </div>

      <ChatInput chat={liveChat} />
    </div>
  );
};

export default ChatMessages;
