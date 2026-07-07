import { useState, useEffect } from 'react';
import { getChatMembers, getChatById, archiveChat, toggleMute, deleteChat, toggleLockChat } from '../../services/chatService';
import { useChat } from '../../context/ChatContext';
import { getStoredUser } from '../../services/authService';

const ChatDetails = ({ chat, onClose }) => {
  const { presenceMap } = useChat();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLocked, setIsLocked] = useState(chat.isLocked || false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const user = getStoredUser();

  useEffect(() => {
    loadData();
  }, [chat._id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatRes, membersRes] = await Promise.all([
        getChatById(chat._id),
        getChatMembers(chat._id)
      ]);
      if (chatRes.success) {
        setIsLocked(chatRes.data.chat.isLocked || false);
        const chatAdmin = chatRes.data.myMembership?.role === 'admin';
        const globalAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr';
        setIsAdmin(chatAdmin || globalAdmin);
      }
      if (membersRes.success) {
        setMembers(membersRes.data.members);
      }
    } catch (err) {
      console.error('Error loading chat details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveChat(chat._id);
      window.location.reload();
    } catch (err) {
      console.error('Error archiving:', err);
    }
  };

  const handleToggleMute = async () => {
    try {
      const res = await toggleMute(chat._id);
      if (res.success) setIsMuted(res.data.isMuted);
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  const handleToggleLock = async () => {
    try {
      const res = await toggleLockChat(chat._id);
      if (res.success) setIsLocked(res.data.isLocked);
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteChat(chat._id);
      window.location.href = '/chat';
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const getStatusDot = (userId) => {
    const presence = presenceMap[userId];
    if (!presence) return 'bg-gray-300';
    return presence.status === 'online' ? 'bg-green-500' : presence.status === 'away' ? 'bg-yellow-500' : 'bg-gray-300';
  };

  const getStatusText = (member) => {
    const presence = member.presence;
    if (!presence || !presence.status) return 'غير متصل';
    if (presence.status === 'online') return 'متصل الآن';
    if (presence.status === 'away') return 'غير نشط';
    if (presence.lastSeen) {
      const diff = Math.floor((new Date() - new Date(presence.lastSeen)) / 60000);
      if (diff < 60) return `منذ ${diff} دقيقة`;
      return `منذ ${Math.floor(diff / 60)} ساعة`;
    }
    return 'غير متصل';
  };

  const getChatTypeLabel = () => {
    if (chat.type === 'department') return 'محادثة قسم';
    if (chat.type === 'shared') return 'محادثة مشتركة';
    if (chat.type === 'task') return 'محادثة مهمة';
    return '';
  };

  const getMemberRoleLabel = (role) => {
    return role === 'admin' ? 'مشرف' : 'عضو';
  };

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="font-bold text-gray-800 text-sm">تفاصيل</h3>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 text-center border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#182E4E] flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-sm">
            {chat.type === 'private' ? '👤' : chat.type === 'task' ? '📋' : chat.type === 'shared' ? '🔗' : '💬'}
          </div>
          <h4 className="font-bold text-gray-800">{chat.name || 'محادثة'}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{getChatTypeLabel()}</p>
          {chat.departments?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {chat.departments.map(dept => (
                <span key={dept._id} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {dept.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
              activeTab === 'members' ? 'text-[#182E4E] border-b-2 border-[#182E4E]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            الأعضاء
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${
              activeTab === 'settings' ? 'text-[#182E4E] border-b-2 border-[#182E4E]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            الإعدادات
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="p-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#182E4E] border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shadow-sm">
                        {member.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusDot(member.user?._id)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{member.user?.name || 'مستخدم'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[11px] text-gray-500">{getStatusText(member)}</p>
                        <span className="text-gray-300">·</span>
                        <span className={`text-[11px] font-medium ${member.role === 'admin' ? 'text-[#182E4E]' : 'text-gray-400'}`}>
                          {getMemberRoleLabel(member.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && members.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">لا يوجد أعضاء</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-3 space-y-1">
            <button
              onClick={handleToggleMute}
              className={`w-full text-right p-3 rounded-xl text-sm flex items-center gap-3 transition-colors ${
                isMuted ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-lg">{isMuted ? '🔔' : '🔕'}</span>
              <span className="font-medium">{isMuted ? 'إلغاء كتم الإشعارات' : 'كتم الإشعارات'}</span>
            </button>

            <button
              onClick={handleArchive}
              className="w-full text-right p-3 rounded-xl text-sm flex items-center gap-3 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <span className="text-lg">📦</span>
              <span className="font-medium">أرشفة المحادثة</span>
            </button>

            {isAdmin && (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <button
                  onClick={handleToggleLock}
                  className={`w-full text-right p-3 rounded-xl text-sm flex items-center gap-3 transition-colors ${
                    isLocked ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{isLocked ? '🔓' : '🔒'}</span>
                  <span className="font-medium">{isLocked ? 'فتح المحادثة' : 'قفل المحادثة'}</span>
                </button>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-right p-3 rounded-xl text-sm flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <span className="text-lg">🗑️</span>
                    <span className="font-medium">حذف المحادثة</span>
                  </button>
                ) : (
                  <div className="mt-2 p-3 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-600 mb-3 font-medium">متأكد من حذف المحادثة؟ لا يمكن التراجع.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        نعم، احذف
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDetails;
