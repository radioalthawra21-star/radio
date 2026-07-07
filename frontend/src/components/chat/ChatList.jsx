import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyChats, getUnreadCount, searchChats, createSharedChat, createPrivateChat } from '../../services/chatService';
import { getStoredUser } from '../../services/authService';
import { useChat } from '../../context/ChatContext';
import { getAllDepartments } from '../../services/departmentService';
import { getAllUsers } from '../../services/userService';

const CreateChatModal = ({ isOpen, onClose, onCreated }) => {
  const [chatType, setChatType] = useState('shared');
  const [departments, setDepartments] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [chatName, setChatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const [deptData, userData] = await Promise.all([
          getAllDepartments(),
          getAllUsers()
        ]);
        setDepartments(deptData?.data?.departments || []);
        setUsers(userData?.data?.users || userData?.users || []);
      } catch (e) {
        console.error('Failed to fetch data', e);
      }
    };
    fetchData();
    setChatType('shared');
    setSelectedDepts([]);
    setSelectedUser(null);
    setUserSearch('');
    setChatName('');
    setError('');
  }, [isOpen]);

  const toggleDept = (id) => {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch) return u._id !== getStoredUser()?._id;
    const q = userSearch.toLowerCase();
    return (
      u._id !== getStoredUser()?._id &&
      (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q))
    );
  });

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (chatType === 'private') {
        if (!selectedUser) {
          setError('يجب اختيار مستخدم');
          setLoading(false);
          return;
        }
        res = await createPrivateChat(selectedUser._id);
      } else {
        if (selectedDepts.length < 1) {
          setError('يجب اختيار قسم واحد على الأقل');
          setLoading(false);
          return;
        }
        res = await createSharedChat({ name: chatName || undefined, departmentIds: selectedDepts });
      }
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
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">محادثة جديدة</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">✕</button>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setChatType('shared')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${chatType === 'shared' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              مجموعة
            </button>
            <button
              onClick={() => setChatType('private')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${chatType === 'private' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              خاصة
            </button>
          </div>

          {chatType === 'shared' ? (
            <>
              <input
                type="text"
                placeholder="اسم المحادثة (اختياري)"
                value={chatName}
                onChange={e => setChatName(e.target.value)}
                className="w-full px-3 py-2.5 mb-4 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#182E4E] focus:ring-1 focus:ring-[#182E4E]/20 transition-colors"
              />
              <p className="text-sm font-medium text-gray-700 mb-3">اختر الأقسام:</p>
              <div className="max-h-48 overflow-y-auto mb-4 space-y-1 rounded-xl border border-gray-100 p-1">
                {departments.map(dept => (
                  <label key={dept._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDepts.includes(dept._id)}
                      onChange={() => toggleDept(dept._id)}
                      className="accent-[#182E4E] w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{dept.name}</span>
                  </label>
                ))}
                {departments.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">جاري التحميل...</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 mb-3">اختر مستخدم:</p>
              <input
                type="text"
                placeholder="بحث عن مستخدم..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full px-3 py-2.5 mb-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#182E4E] focus:ring-1 focus:ring-[#182E4E]/20 transition-colors"
              />
              <div className="max-h-48 overflow-y-auto mb-4 space-y-1 rounded-xl border border-gray-100 p-1">
                {filteredUsers.map(u => (
                  <button
                    key={u._id}
                    onClick={() => setSelectedUser(selectedUser?._id === u._id ? null : u)}
                    className={`w-full text-right px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                      selectedUser?._id === u._id ? 'bg-[#CDD6E8]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.department || u.email || ''}</p>
                    </div>
                    {selectedUser?._id === u._id && (
                      <span className="mr-auto text-[#182E4E]">✓</span>
                    )}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">لا يوجد مستخدمين</p>
                )}
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading || (chatType === 'shared' ? selectedDepts.length < 1 : !selectedUser)}
            className="w-full py-2.5 bg-[#182E4E] text-white rounded-xl hover:bg-[#152842] disabled:opacity-50 transition-colors text-sm font-medium active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                جاري الإنشاء...
              </span>
            ) : chatType === 'private' ? 'بدء محادثة خاصة' : 'إنشاء المحادثة'}
          </button>
        </div>
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
    const refresh = () => { fetchChats(); fetchUnread(); };
    socket.on('chat:message', refresh);
    socket.on('chat:edited', refresh);
    socket.on('chat:deleted', refresh);
    socket.on('notification', () => fetchUnread());
    return () => {
      socket.off('chat:message', refresh);
      socket.off('chat:edited', refresh);
      socket.off('chat:deleted', refresh);
      socket.off('notification');
    };
  }, [socket, fetchChats, fetchUnread]);

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
    if (chat.type === 'private') return '👤';
    if (chat.type === 'task') return '📋';
    if (chat.type === 'shared') return '🔗';
    return '💬';
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'private') {
      const other = chat.participants?.find(p => p._id !== getStoredUser()?._id);
      return other?.name || 'محادثة خاصة';
    }
    if (chat.type === 'task' && chat.taskId) return `مهمة: ${chat.taskId.title || ''}`;
    if (chat.departments?.length) return chat.departments.map(d => d.name).join(' + ');
    return 'محادثة';
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;
    if (diffDays < 7) return `منذ ${diffDays} ي`;
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  };

  const hasOnlineMember = (chat) => {
    return false;
  };

  return (
    <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-3 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">المحادثات</h2>
          <div className="flex items-center gap-1.5">
            {mentionCount > 0 && (
              <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5 animate-fade-in">
                @ {mentionCount}
              </span>
            )}
            {unreadTotal > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium animate-fade-in min-w-[20px] text-center">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-[#182E4E]"
              title="محادثة جديدة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="بحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#182E4E] focus:ring-1 focus:ring-[#182E4E]/20 transition-colors bg-gray-50"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.length >= 2 ? (
          <div className="p-2 animate-fade-in">
            {searchResults.messages.map((msg, i) => (
              <button
                key={`msg-${msg._id || i}`}
                onClick={() => onChatSelect({ _id: msg.chat })}
                className="w-full text-right p-3 rounded-xl hover:bg-gray-50 transition-colors mb-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">💬</div>
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
                className="w-full text-right p-3 rounded-xl hover:bg-gray-50 transition-colors mb-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#182E4E] flex items-center justify-center text-sm flex-shrink-0 text-white">{getChatIcon(chat)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.name || 'محادثة'}</p>
                  </div>
                </div>
              </button>
            ))}
            {searchResults.users.map(u => (
              <button
                key={`user-${u._id}`}
                className="w-full text-right p-3 rounded-xl hover:bg-gray-50 transition-colors mb-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.department || ''}</p>
                  </div>
                </div>
              </button>
            ))}
            {searchQuery.length >= 2 && !searching && !searchResults.messages.length && !searchResults.chats.length && !searchResults.users.length && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm">لا توجد نتائج</p>
                <p className="text-xs mt-1">حاول بكلمات بحث مختلفة</p>
              </div>
            )}
            {searching && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#182E4E] border-t-transparent"></div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#182E4E] border-t-transparent"></div>
            <p className="text-xs text-gray-400">جاري التحميل...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">لا توجد محادثات</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-sm text-[#182E4E] hover:underline"
            >
              أنشئ محادثة جديدة
            </button>
          </div>
        ) : (
          <div className="py-1">
            {chats.map((chat, index) => {
              const isActive = activeChatId === chat._id;
              const isUnread = chat.unreadCount > 0;

              return (
                <button
                  key={chat._id}
                  onClick={() => onChatSelect(chat)}
                  className={`w-full text-right px-3 py-2.5 border-b border-gray-50 transition-all hover:bg-gray-50 active:bg-gray-100 ${
                    isActive ? 'bg-[#CDD6E8] hover:bg-[#CDD6E8]' : ''
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm shadow-sm ${
                        isActive ? 'bg-[#182E4E]' : 'bg-[#182E4E]'
                      }`}>
                        {getChatIcon(chat)}
                      </div>
                      {chat.lastMessage?.sender && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          Math.random() > 0.5 ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {getChatName(chat)}
                        </p>
                        {chat.lastMessage?.createdAt && (
                          <span className={`text-[10px] flex-shrink-0 mr-2 ${isUnread ? 'text-[#182E4E] font-medium' : 'text-gray-400'}`}>
                            {formatRelativeTime(chat.lastMessage.createdAt)}
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
                          <span className="bg-[#182E4E] text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold flex-shrink-0 mr-2 leading-none">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
