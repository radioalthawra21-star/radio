import { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { uploadAttachment } from '../../services/chatService';
import { getStoredUser } from '../../services/authService';
import { searchChats } from '../../services/chatService';

const EMOJI_LIST = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣','💕','💞','💓','💗','💖','💘','💝','💟','♥','💌','🫶','🎉','🎊','🎈','🎁','🏆','⭐','🌟','✨','🔥','💯','✅','❌','✔','🌹','🌸','💐','🌺','🍕','🍔','🍟','🌭','🍿','🧁','🎂','🍰','☕','🍵','🥤','🍺','🍻','🥂','🍷','🥃','🍸'];

const ChatInput = ({ chat, replyTo, onCancelReply }) => {
  const chatId = chat?._id;
  const isLocked = chat?.isLocked;
  const user = getStoredUser();
  const canSendWhenLocked = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr';
  const inputDisabled = isLocked && !canSendWhenLocked;
  const { sendMessage, emitTyping } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleTyping = useCallback(() => {
    emitTyping(chatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(chatId, false);
    }, 2000);
  }, [chatId, emitTyping]);

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);
    handleTyping();

    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setMentionSearch(afterAt);
        setShowMentionPopup(true);
        searchChats(afterAt).then(res => {
          if (res.success) setMentionUsers(res.data.users || []);
        });
        return;
      }
    }
    setShowMentionPopup(false);
  };

  const handleMentionSelect = (username) => {
    const lastAt = content.lastIndexOf('@');
    const before = content.slice(0, lastAt);
    setContent(`${before}@${username} `);
    setShowMentionPopup(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newAttachments = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`الملف ${file.name} كبير جداً (الحد الأقصى 20MB)`);
        continue;
      }
      try {
        const res = await uploadAttachment(file);
        if (res.success) {
          newAttachments.push(res.data);
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\S+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleSend = async () => {
    const hasContent = content.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if ((!hasContent && !hasAttachments) || sending) return;

    setSending(true);
    emitTyping(chatId, false);

    const msgData = {
      chatId,
      content: content.trim(),
      attachments,
      mentions: extractMentions(content)
    };
    if (replyTo) {
      msgData.replyTo = replyTo._id || replyTo;
    }

    sendMessage(msgData, (response) => {
      setSending(false);
      if (response?.success) {
        setContent('');
        setAttachments([]);
        onCancelReply?.();
      } else if (response?.error) {
        alert(response.error);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📎';
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {inputDisabled && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 text-center flex items-center justify-center gap-1">
          <span>🔒</span> المحادثة مقفلة — فقط المشرف يمكنه الإرسال
        </div>
      )}
      {isLocked && !inputDisabled && (
        <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-xs text-green-700 text-center flex items-center justify-center gap-1">
          <span>🔓</span> المحادثة مقفلة — ولكن يمكنك الإرسال لأنك مشرف
        </div>
      )}

      {replyTo && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <div className="w-1 h-8 bg-blue-400 rounded-full flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-700">رد على {replyTo.sender?.name || 'رسالة'}</p>
            <p className="text-xs text-blue-600 truncate">{replyTo.content || '[مرفق]'}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-blue-100 rounded text-blue-500 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div key={i} className="group relative bg-gray-100 rounded-lg overflow-hidden" style={{ width: 64, height: 64 }}>
              {att.mimeType?.startsWith('image/') ? (
                <img src={att.fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {getFileIcon(att.mimeType)}
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 p-2 safe-bottom">
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={inputDisabled}
            className="p-2 text-gray-500 hover:text-[#182E4E] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            title="إيموجي"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={inputDisabled}
            className="p-2 text-gray-500 hover:text-[#182E4E] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            title="إرفاق ملف"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={inputDisabled}
            className="p-2 text-gray-500 hover:text-[#182E4E] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            title="صورة"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx,.txt" />
        <input ref={imageInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*" />

        <div className="flex-1 relative">
          {showMentionPopup && mentionUsers.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
              {mentionUsers.map(u => (
                <button
                  key={u._id}
                  onClick={() => handleMentionSelect(u.name || u.username)}
                  className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-gray-400 mr-auto">{u.department || ''}</span>
                </button>
              ))}
            </div>
          )}

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2" style={{ width: 280 }}>
              <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                {EMOJI_LIST.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={inputDisabled ? 'المحادثة مقفلة...' : 'اكتب رسالتك...'}
            rows={1}
            disabled={inputDisabled}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#182E4E] focus:ring-1 focus:ring-[#182E4E]/20 resize-none min-h-[40px] max-h-[120px] disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={(!content.trim() && !attachments.length) || sending || inputDisabled}
          className="p-2.5 bg-[#182E4E] text-white rounded-xl hover:bg-[#152842] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
