import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyChats, getUnreadCount, searchChats, createSharedChat } from '../../services/chatService';
import { getStoredUser } from '../../services/authService';
import { useChat } from '../../context/ChatContext';
import { formatDateArabic } from '../../utils/dateUtils';
import { getAllDepartments } from '../../services/departmentService';

const CreateChatModal = ({ isOpen, onClose, onCreated }) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [chatName, setChatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchDepts = async () => {
      try {
        const data = await getAllDepartments();
        setDepartments(data?.data?.departments || []);
      } catch (e) {
        console.error('Failed to fetch departments', e);
      }
    };
    fetchDepts();
    setSelectedDepts([]);
    setChatName('');
    setError('');
  }, [isOpen]);

  const toggleDept = (id) => {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedDepts.length < 2) {
      setError('يجب اختيار قسمين على الأقل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createSharedChat({ name: chatName || undefined, departmentIds: selectedDepts });
      if (res.success) {
        onCreated?.(res.data.chat);
        onClose();
      } else {
        setError(res.message || 'حدث خطأ');
      }
    } catch (e) {
      setError('فشل إنشاء المحادثة');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">محادثة جديدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <input
          type="text"
          placeholder="اسم المحادثة (اختياري)"
          value={chatName}
          onChange={e => setChatName(e.target.value)}
          className="w-full p-2 mb-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#182E4E]"
        />
        <p className="text-sm text-gray-600 mb-2">اختر الأقسام:</p>
        <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
          {departments.map(dept => (
            <label key={dept._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDepts.includes(dept._id)}
                onChange={() => toggleDept(dept._id)}
                className="accent-[#182E4E]"
              />
              <span className="text-sm">{dept.name}</span>
            </label>
          ))}
          {departments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">جاري التحميل...</p>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading || selectedDepts.length < 2}
          className="w-full py-2 bg-[#182E4E] text-white rounded-lg hover:bg-[#152842] disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء المحادثة'}
        </button>
      </div>
    </div>
  );
};

const ChatList = ({ onChatSelect, activeChatId, refreshKey }) => {
  const { socket, presenceMap } = useChat();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ chats: [], messages: [], users: [] });
  const [searching, setSearching] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const user = getStoredUser();
  const searchTimeout = useRef(null);

  const fetchChats = useCallback(async () => {
    try {
      const res = await getMyChats();
      if (res.success) {
        setChats(res.data.chats);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      if (res.success) {
        setUnreadTotal(res.data.total);
        setMentionCount(res.data.mentions);
      }
    } catch (err) {
      console.error('Error fetching unread:', err);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    fetchUnread();
  }, [fetchChats, fetchUnread, refreshKey]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (message) => {
      fetchChats();
      fetchUnread();
    };
    socket.on('chat:message', handleNewMessage);
    return () => socket.off('chat:message', handleNewMessage);
  }, [socket, fetchChats, fetchUnread]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = () => {
      fetchUnread();
    };
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, fetchUnread]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await searchChats(searchQuery);
          if (res.success) setSearchResults(res.data);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setSearching(false);
        }
      }, 400);
    } else {
      setSearchResults({ chats: [], messages: [], users: [] });
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const getChatIcon = (chat) => {
    if (chat.type === 'task') return '📋';
    if (chat.type === 'shared') return '🔗';
    return '💬';
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'task' && chat.taskId) return `مهمة: ${chat.taskId.title || ''}`;
    if (chat.departments?.length) return chat.departments.map(d => d.name).join(' + ');
    return 'محادثة';
  };

  const getLastMessageTime = (chat) => {
    if (!chat.lastMessage?.createdAt) return '';
    return formatDateArabic(chat.lastMessage.createdAt);
  };

  const getSearchItemIcon = (item) => {
    if (item.sender) return '💬';
    if (item.email) return '👤';
    return '💬';
  };

  return (
    <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">المحادثات</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-[#182E4E]"
              title="محادثة جديدة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {mentionCount > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                @ {mentionCount}
              </span>
            )}
            {unreadTotal > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadTotal}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="بحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#182E4E]"
          />
          <span className="absolute left-3 top-2 text-gray-400">
            {searching ? '...' : '🔍'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.length >= 2 ? (
          <div className="p-2">
            {searchResults.messages.map((msg, i) => (
              <button
                key={`msg-${msg._id || i}`}
                onClick={() => onChatSelect({ _id: msg.chat })}
                className="w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors mb-1"
              >
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.sender?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                  </div>
                </div>
              </button>
            ))}
            {searchResults.chats.map(chat => (
              <button
                key={`chat-${chat._id}`}
                onClick={() => onChatSelect(chat)}
                className="w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors mb-1"
              >
                <div className="flex items-center gap-2">
                  <span>{getChatIcon(chat)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.name || 'محادثة'}</p>
                  </div>
                </div>
              </button>
            ))}
            {searchResults.users.map(userItem => (
              <button
                key={`user-${userItem._id}`}
                className="w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors mb-1"
              >
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{userItem.name}</p>
                    <p className="text-xs text-gray-500">{userItem.department}</p>
                  </div>
                </div>
              </button>
            ))}
            {searchQuery.length >= 2 && !searchResults.messages.length && !searchResults.chats.length && !searchResults.users.length && !searching && (
              <p className="text-center text-gray-400 py-8 text-sm">لا توجد نتائج</p>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#182E4E]"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">لا توجد محادثات</p>
          </div>
        ) : (
          chats.map(chat => {
            const isActive = activeChatId === chat._id;
            const isUnread = chat.unreadCount > 0;
            const chatPresences = chat.departments?.length
              ? chat.departments.map(d => d._id).join(',')
              : '';
            return (
              <button
                key={chat._id}
                onClick={() => onChatSelect(chat)}
                className={`w-full text-right p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-[#CDD6E8]' : ''
                } ${isUnread ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#182E4E] flex items-center justify-center text-white text-sm flex-shrink-0">
                    {getChatIcon(chat)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {getChatName(chat)}
                      </p>
                      {chat.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400 flex-shrink-0 mr-2">
                          {getLastMessageTime(chat)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-xs truncate ${isUnread ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                        {chat.lastMessage
                          ? `${chat.lastMessage.senderName || ''}: ${chat.lastMessage.content || ''}`
                          : chat.type === 'department'
                            ? 'محادثة القسم'
                            : chat.type === 'task'
                              ? 'محادثة المهمة'
                              : 'محادثة مشتركة'}
                      </p>
                      {isUnread && (
                        <span className="bg-[#182E4E] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0 mr-2">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(chat) => {
          onChatSelect(chat);
          fetchChats();
        }}
      />
    </div>
  );
};

export default ChatList;
