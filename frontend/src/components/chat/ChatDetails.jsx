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
    if (!presence) return 'bg-gray-400';
    return presence.status === 'online' ? 'bg-green-500' : presence.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400';
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
    <div className="w-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">تفاصيل</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 text-center border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#182E4E] flex items-center justify-center text-white text-2xl mx-auto mb-2">
            {chat.type === 'task' ? '📋' : chat.type === 'shared' ? '🔗' : '💬'}
          </div>
          <h4 className="font-bold text-gray-800">{chat.name || 'محادثة'}</h4>
          <p className="text-xs text-gray-500 mt-1">{getChatTypeLabel()}</p>
          {chat.departments?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-2">
              {chat.departments.map(dept => (
                <span
                  key={dept._id}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                >
                  {dept.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-b border-gray-100">
          <button
            onClick={handleToggleMute}
            className={`w-full text-right p-2 rounded-lg text-sm flex items-center gap-2 ${
              isMuted ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span>{isMuted ? '🔔' : '🔕'}</span>
            {isMuted ? 'إلغاء كتم الإشعارات' : 'كتم الإشعارات'}
          </button>
          <button
            onClick={handleArchive}
            className="w-full text-right p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-100 text-gray-700 mt-1"
          >
            <span>📦</span>
            أرشفة المحادثة
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleToggleLock}
                className={`w-full text-right p-2 rounded-lg text-sm flex items-center gap-2 mt-1 ${
                  isLocked ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>{isLocked ? '🔓' : '🔒'}</span>
                {isLocked ? 'فتح المحادثة' : 'قفل المحادثة (الرسائل للمشرف فقط)'}
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-right p-2 rounded-lg text-sm flex items-center gap-2 mt-1 hover:bg-red-50 text-red-600"
                >
                  <span>🗑️</span>
                  حذف المحادثة
                </button>
              ) : (
                <div className="mt-2 p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600 mb-2">متأكد من حذف المحادثة؟</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                    >
                      نعم، احذف
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">
              الأعضاء
            </h4>
            <span className="text-xs text-gray-500">{members.length}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#182E4E]"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusDot(member.user?._id)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.user?.name || 'مستخدم'}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-gray-500">{getStatusText(member)}</p>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{getMemberRoleLabel(member.role)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDetails;