/**
 * Messages Page
 * Internal messaging system - Inbox and Sent messages
 */

import { useState, useEffect } from 'react';
import { getInboxMessages, getSentMessages, sendMessage, markAsRead, deleteMessage } from '../services/messageService';
import { getAllUsers } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { formatDateArabic } from '../utils/dateUtils';
import Card from '../components/common/Card';

const Messages = () => {
  const currentUser = getStoredUser();
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    receiverId: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inboxRes, sentRes, usersRes] = await Promise.all([
        getInboxMessages(),
        getSentMessages(),
        getAllUsers()
      ]);
      
      if (inboxRes?.success) {
        setInboxMessages(inboxRes.data?.messages || []);
      }
      if (sentRes?.success) {
        setSentMessages(sentRes.data?.messages || []);
      }
      if (usersRes?.success) {
        const allUsers = usersRes.data?.users || [];
        setUsers(allUsers.filter(u => u._id !== currentUser?._id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.receiverId || !formData.subject || !formData.content) {
      return;
    }

    try {
      setComposing(true);
      const response = await sendMessage(formData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'تم إرسال الرسالة بنجاح' });
        setFormData({ receiverId: '', subject: '', content: '' });
        setShowCompose(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: response.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في إرسال الرسالة' });
    } finally {
      setComposing(false);
    }
  };

  const handleRead = async (messageId) => {
    try {
      await markAsRead(messageId);
      fetchData();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    
    try {
      const response = await deleteMessage(messageId);
      if (response.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const unreadCount = inboxMessages.filter(m => !m.isRead).length;
  const currentMessages = activeTab === 'inbox' ? inboxMessages : sentMessages;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">الرسائل الداخلية</h2>
        <button
          onClick={() => setShowCompose(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          ➕ رسالة جديدة
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-2 px-4 ${
            activeTab === 'inbox' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' 
              : 'text-gray-500'
          }`}
        >
          📥 الوارد ({unreadCount})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`pb-2 px-4 ${
            activeTab === 'sent' 
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' 
              : 'text-gray-500'
          }`}
        >
          📤 المرسلة ({sentMessages.length})
        </button>
      </div>

      {/* Messages List */}
      {currentMessages.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-4">📭</p>
          <p>لا توجد رسائل</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentMessages.map(msg => (
            <div 
              key={msg._id} 
              className={`p-4 rounded-lg shadow ${
                !msg.isRead && activeTab === 'inbox' 
                  ? 'bg-blue-50 border-l-4 border-blue-600' 
                  : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {activeTab === 'inbox' ? (
                      <span className="text-sm text-gray-600">من: {msg.sender?.name}</span>
                    ) : (
                      <span className="text-sm text-gray-600">إلى: {msg.receiver?.name}</span>
                    )}
                    {!msg.isRead && activeTab === 'inbox' && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">جديد</span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-800">{msg.subject}</h4>
                  <p className="text-sm text-gray-600 mt-1">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDateArabic(msg.createdAt)}</p>
                </div>
                <div className="flex gap-2 mr-4">
                  {!msg.isRead && activeTab === 'inbox' && (
                    <button
                      onClick={() => handleRead(msg._id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      ✓ قراءة
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(msg._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    🗑 حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold mb-4">رسالة جديدة</h3>
            
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المستلم</label>
                <select
                  value={formData.receiverId}
                  onChange={(e) => setFormData({...formData, receiverId: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-white"
                  required
                >
                  <option value="">-- اختر المستلم --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير قسم' : 'موظف'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المحتوى</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows="5"
                  className="w-full p-3 border rounded-lg"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={composing}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {composing ? 'جاري الإرسال...' : 'إرسال'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;