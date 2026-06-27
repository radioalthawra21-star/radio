import { useState } from 'react';
import { getStoredUser } from '../../services/authService';
import { formatDateTimeArabic } from '../../utils/dateUtils';

const FILE_ICONS = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/zip': '📦',
  'application/x-zip-compressed': '📦',
  'text/plain': '📄'
};

const ChatMessage = ({ message, onReadReceipt }) => {
  const user = getStoredUser();
  const isMine = message.sender?._id === user?._id;
  const [showActions, setShowActions] = useState(false);

  const getFileIcon = (mimeType) => FILE_ICONS[mimeType] || '📎';

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = () => {
    return '✓';
  };

  const handleAttachmentClick = (attachment) => {
    const url = attachment.fileUrl.startsWith('http')
      ? attachment.fileUrl
      : `${window.location.origin}${attachment.fileUrl}`;
    window.open(url, '_blank');
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} mb-2 opacity-50`}>
        <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-400 italic">
          تم حذف هذه الرسالة
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-2'}`}>
        {!isMine && message.sender && (
          <p className="text-xs text-gray-500 mb-1 mr-2">{message.sender.name}</p>
        )}
        <div
          className={`relative group ${isMine ? 'bg-[#182E4E] text-white' : 'bg-white text-gray-800 border border-gray-200'} rounded-2xl px-4 py-2.5 shadow-sm`}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg text-xs ${isMine ? 'bg-white/10' : 'bg-gray-100'}`}>
              <p className="font-medium">{message.replyTo.sender?.name || 'مستخدم'}</p>
              <p className="truncate">{message.replyTo.content || ''}</p>
            </div>
          )}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {message.attachments?.length > 0 && (
            <div className={`mt-2 space-y-1 ${isMine ? '' : ''}`}>
              {message.attachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => handleAttachmentClick(att)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs w-full text-right ${
                    isMine ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  } transition-colors`}
                >
                  <span className="text-lg">{getFileIcon(att.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{att.originalName}</p>
                    <p className={`text-xs ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                      {formatFileSize(att.fileSize)}
                    </p>
                  </div>
                  <span className="text-xs">📥</span>
                </button>
              ))}
            </div>
          )}
          {message.mentions?.length > 0 && (
            <div className={`mt-1 text-xs ${isMine ? 'text-yellow-300' : 'text-purple-500'}`}>
              @ تمت الإشارة
            </div>
          )}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-start' : 'justify-end'}`}>
            <span className={`text-xs ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
              {formatDateTimeArabic(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className={`text-xs ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                (معدلة)
              </span>
            )}
            {isMine && (
              <span className={`text-xs ${isMine ? 'text-white/70' : ''}`}>
                {getStatusIcon()}
              </span>
            )}
          </div>
        </div>
      </div>
      {!isMine && message.sender?.profileImage && (
        <img
          src={message.sender.profileImage}
          alt=""
          className="w-8 h-8 rounded-full ml-2 mt-1 flex-shrink-0"
        />
      )}
    </div>
  );
};

export default ChatMessage;
