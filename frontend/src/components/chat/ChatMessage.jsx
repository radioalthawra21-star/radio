import { useState, useRef, useEffect } from 'react';
import { getStoredUser } from '../../services/authService';

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

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ChatMessage = ({ message, onReply, onEdit, onDelete, showSender = true }) => {
  const user = getStoredUser();
  const isMine = message.sender?._id === user?._id;
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [msgReactions, setMsgReactions] = useState(message.reactions || []);
  const contextRef = useRef(null);
  const msgRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowContextMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getFileIcon = (mimeType) => FILE_ICONS[mimeType] || '📎';

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMsgTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleAttachmentClick = (attachment) => {
    if (attachment.mimeType?.startsWith('image/')) {
      setImgPreview(attachment.fileUrl);
      return;
    }
    const url = attachment.fileUrl.startsWith('http')
      ? attachment.fileUrl
      : `${window.location.origin}${attachment.fileUrl}`;
    window.open(url, '_blank');
  };

  const handleReact = (emoji) => {
    const existing = msgReactions.find(r => r.userId === user._id && r.emoji === emoji);
    if (existing) {
      setMsgReactions(prev => prev.filter(r => !(r.userId === user._id && r.emoji === emoji)));
    } else {
      setMsgReactions(prev => [...prev.filter(r => r.userId !== user._id), { userId: user._id, emoji }]);
    }
    setShowReactions(false);
  };

  const getReactionsSummary = () => {
    const grouped = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = 0;
      grouped[r.emoji]++;
    });
    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setShowContextMenu(false);
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} mb-2 animate-fade-in`}>
        <div className="bg-gray-100 rounded-xl px-4 py-2 text-xs text-gray-400 italic flex items-center gap-1">
          <span>🚫</span> تم حذف هذه الرسالة
        </div>
      </div>
    );
  }

  const reactionsSummary = getReactionsSummary();

  return (
    <>
      <div
        ref={msgRef}
        className={`flex ${isMine ? 'justify-start' : 'justify-end'} mb-2 px-1 animate-fade-in group`
        }
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); setShowContextMenu(true); }}
      >
        <div className={`max-w-[88%] md:max-w-[72%] ${isMine ? '' : ''}`}>
          {!isMine && showSender && message.sender && (
            <div className="flex items-center gap-1.5 mb-0.5 mr-1">
              {message.sender.profileImage ? (
                <img src={message.sender.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                  {message.sender.name?.charAt(0) || '?'}
                </div>
              )}
              <p className="text-[11px] font-medium text-gray-500">{message.sender.name}</p>
            </div>
          )}
          <div className="relative">
            <div
              className={`relative ${isMine ? 'bg-[#182E4E] text-white' : 'bg-white text-gray-800 border border-gray-200'} rounded-2xl px-3.5 py-2.5 shadow-sm transition-shadow hover:shadow-md`}
            >
              {message.replyTo && message.replyTo._id && (
                <div className={`mb-2 p-2 rounded-lg text-xs border-r-2 ${isMine ? 'bg-white/10 border-white/30' : 'bg-gray-100 border-gray-300'}`}>
                  <p className={`font-semibold text-xs ${isMine ? 'text-white/80' : 'text-gray-600'}`}>
                    {message.replyTo.sender?.name || 'مستخدم'}
                  </p>
                  <p className={`truncate ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
                    {message.replyTo.content || '[مرفق]'}
                  </p>
                </div>
              )}

              {message.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {message.attachments?.length > 0 && (
                <div className={`mt-2 space-y-1.5`}>
                  {message.attachments.map((att, i) => (
                    att.mimeType?.startsWith('image/') ? (
                      <button
                        key={i}
                        onClick={() => handleAttachmentClick(att)}
                        className="block w-full rounded-xl overflow-hidden hover:opacity-95 transition-opacity"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.originalName}
                          className="w-full max-h-64 object-cover rounded-xl"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <button
                        key={i}
                        onClick={() => handleAttachmentClick(att)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs w-full text-right ${
                          isMine ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        } transition-colors border ${isMine ? 'border-white/10' : 'border-gray-100'}`}
                      >
                        <span className="text-xl">{getFileIcon(att.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-sm">{att.originalName}</p>
                          <p className={`text-[11px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                            {formatFileSize(att.fileSize)}
                          </p>
                        </div>
                        <span className="text-base opacity-60">⬇️</span>
                      </button>
                    )
                  ))}
                </div>
              )}

              <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-start' : 'justify-end'}`}>
                <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                  {formatMsgTime(message.createdAt)}
                </span>
                {message.isEdited && (
                  <span className={`text-[10px] ${isMine ? 'text-white/40' : 'text-gray-400'}`}>
                    (معدلة)
                  </span>
                )}
                {isMine && (
                  <svg className={`w-3.5 h-3.5 ${isMine ? 'text-white/50' : ''}`} viewBox="0 0 16 11" fill="currentColor">
                    <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.336-.153.463.463 0 00-.343.146.533.533 0 00-.145.356c0 .127.047.259.145.356l2.404 2.406a.525.525 0 00.747 0l6.414-7.917a.482.482 0 00.11-.381.44.44 0 00-.21-.31l-.1-.12z"/>
                  </svg>
                )}
              </div>
            </div>

            {reactionsSummary.length > 0 && (
              <div className={`flex gap-0.5 -mt-2 ${isMine ? 'mr-3 justify-start' : 'ml-3 justify-end'}`}>
                <div className={`flex gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm`}>
                  {reactionsSummary.map((r, i) => (
                    <span key={i} className="text-xs cursor-default" title={`${r.count}`}>
                      {r.emoji}{r.count > 1 ? <span className="text-[10px] text-gray-500 mr-px">{r.count}</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`absolute -top-2 ${isMine ? 'right-0' : 'left-0'} flex gap-0.5 transition-all duration-200 ${
              showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
            }`}>
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-sm shadow-sm hover:bg-gray-50 hover:shadow transition-all"
                title="تفاعل"
              >
                😊
              </button>
              <button
                onClick={() => onReply?.(message)}
                className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-sm shadow-sm hover:bg-gray-50 hover:shadow transition-all"
                title="رد"
              >
                ↩️
              </button>
            </div>

            {showReactions && (
              <div className={`absolute -top-10 ${isMine ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-full shadow-xl px-2 py-1.5 flex gap-1 z-30 animate-fade-in`}>
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={`w-7 h-7 flex items-center justify-center text-lg hover:scale-125 transition-transform ${
                      msgReactions.some(r => r.userId === user._id && r.emoji === emoji)
                        ? 'scale-110'
                        : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {showContextMenu && (
              <div
                ref={contextRef}
                className={`absolute ${isMine ? 'left-0' : 'right-0'} top-0 z-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px] animate-fade-in`}
                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
              >
                {isMine && (
                  <button
                    onClick={() => { onEdit?.(message); setShowContextMenu(false); }}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>✏️</span> تعديل
                  </button>
                )}
                {onReply && (
                  <button
                    onClick={() => { onReply?.(message); setShowContextMenu(false); }}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>↩️</span> رد
                  </button>
                )}
                {message.content && (
                  <button
                    onClick={handleCopy}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>📋</span> نسخ
                  </button>
                )}
                {isMine && (
                  <button
                    onClick={() => { onDelete?.(message._id); setShowContextMenu(false); }}
                    className="w-full text-right px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <span>🗑️</span> حذف
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {imgPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setImgPreview(null)}
        >
          <button
            onClick={() => setImgPreview(null)}
            className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ✕
          </button>
          <img
            src={imgPreview}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ChatMessage;
