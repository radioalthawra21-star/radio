import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatMessages } from '../../services/chatService';
import { useChat } from '../../context/ChatContext';
import { getStoredUser } from '../../services/authService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const ChatMessages = ({ chat, onToggleDetails, onMessageSent, onBack }) => {
  const { socket, typingUsers, joinChat, markAsRead, editMessage, deleteMessage } = useChat();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [liveLocked, setLiveLocked] = useState(chat?.isLocked || false);
  const [replyTo, setReplyTo] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const user = getStoredUser();
  const isInitialLoad = useRef(true);
  const prevChatId = useRef(null);

  const liveChat = chat ? { ...chat, isLocked: liveLocked } : chat;

  const loadMessages = useCallback(async () => {
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
  }, [chat?._id, markAsRead]);

  useEffect(() => {
    if (chat?._id && chat._id !== prevChatId.current) {
      prevChatId.current = chat._id;
      joinChat(chat._id);
      loadMessages();
      setLiveLocked(chat.isLocked || false);
      setReplyTo(null);
    }
    return () => {
      if (chat?._id !== prevChatId.current) {
        setMessages([]);
        isInitialLoad.current = true;
      }
    };
  }, [chat?._id, joinChat, loadMessages]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail.chatId === chat?._id) {
        setLiveLocked(e.detail.isLocked);
      }
    };
    window.addEventListener('chat-lock-toggled', handler);
    return () => window.removeEventListener('chat-lock-toggled', handler);
  }, [chat?._id]);

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

  const scrollToBottom = useCallback((force) => {
    setTimeout(() => {
      const el = messagesEndRef.current;
      if (el) {
        el.scrollIntoView({ behavior: force ? 'auto' : 'smooth', block: 'end' });
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (isInitialLoad.current && !loading) {
      scrollToBottom(true);
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
    if (!el) return;

    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    setShowScrollBtn(!isNearBottom);

    if (!hasMore || loadingMore) return;
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
    if (chat.type === 'private') {
      const other = chat.participants?.find(p => p._id !== user?._id);
      return other?.name || 'محادثة خاصة';
    }
    if (chat.type === 'task' && chat.taskId) return chat.taskId.title || 'مهمة';
    if (chat.departments?.length) return chat.departments.map(d => d.name).join(' + ');
    return 'محادثة';
  };

  const getChatSubtitle = () => {
    if (chat.type === 'private') return 'محادثة خاصة';
    if (chat.type === 'department') return 'محادثة القسم';
    if (chat.type === 'task') return `#${chat.taskId?._id?.slice(-4) || ''}`;
    if (chat.type === 'shared') return 'محادثة مشتركة';
    return '';
  };

  const chatTypingKey = `${chat?._id}:${user?._id}`;
  const typingEntries = Object.keys(typingUsers)
    .filter(key => key.startsWith(`${chat?._id}:`) && key !== chatTypingKey);

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDate.getTime() === today.getTime()) return 'اليوم';
    if (msgDate.getTime() === yesterday.getTime()) return 'أمس';
    return date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleEdit = (message) => {
    const newContent = prompt('تعديل الرسالة:', message.content);
    if (newContent && newContent !== message.content) {
      editMessage({ messageId: message._id, content: newContent }, (res) => {
        if (!res?.success) alert(res?.error || 'حدث خطأ');
      });
    }
  };

  const handleDelete = (messageId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      deleteMessage({ messageId }, (res) => {
        if (!res?.success) alert(res?.error || 'حدث خطأ');
      });
    }
  };

  const shouldShowSender = (msg, index) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (prev.isDeleted) return true;
    if (prev.sender?._id !== msg.sender?._id) return true;
    const diff = new Date(msg.createdAt) - new Date(prev.createdAt);
    if (diff > 300000) return true;
    return false;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] min-w-0 min-h-0 relative" style={{ height: '100%' }}>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="العودة للقائمة"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#182E4E] flex items-center justify-center text-white text-sm flex-shrink-0 shadow-sm">
            {chat.type === 'private' ? '👤' : chat.type === 'task' ? '📋' : chat.type === 'shared' ? '🔗' : '💬'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate">{getChatTitle()}</h3>
            <p className="text-[11px] text-gray-500 truncate">
              {typingEntries.length > 0
                ? 'يكتب...'
                : getChatSubtitle()
              }
            </p>
          </div>
        </div>
        <button
          onClick={onToggleDetails}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          title="تفاصيل المحادثة"
          aria-label="تفاصيل المحادثة"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 py-3 space-y-0.5"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '20px 20px' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#182E4E] border-t-transparent"></div>
            <p className="text-sm text-gray-400">جاري التحميل...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500">لا توجد رسائل بعد</p>
            <p className="text-xs text-gray-400 mt-1">كن أول من يرسل رسالة</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center py-3">
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#182E4E] border-t-transparent mx-auto"></div>
                ) : (
                  <button
                    onClick={loadMore}
                    className="text-xs text-[#182E4E] hover:underline opacity-60 hover:opacity-100 transition-opacity"
                  >
                    تحميل المزيد من الرسائل
                  </button>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg._id || i}>
                {(i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString()) && (
                  <div className="flex justify-center my-3 animate-fade-in">
                    <span className="bg-white/80 backdrop-blur-sm text-gray-500 text-[11px] px-3 py-1 rounded-full shadow-sm border border-gray-100">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}
                <ChatMessage
                  message={msg}
                  showSender={shouldShowSender(msg, i)}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />

            {typingEntries.length > 0 && (
              <div className="flex items-center gap-2 text-gray-400 py-2 animate-fade-in">
                <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs text-gray-500">يكتب...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-[#182E4E] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#152842] transition-all animate-fade-in z-20 active:scale-95"
          style={{ bottom: '72px' }}
          title="الذهاب إلى آخر الرسائل"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      <div className="flex-shrink-0">
        <ChatInput chat={liveChat} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>
    </div>
  );
};

export default ChatMessages;
