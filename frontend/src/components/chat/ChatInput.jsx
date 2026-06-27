import { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { uploadAttachment } from '../../services/chatService';
import { getStoredUser } from '../../services/authService';

const ChatInput = ({ chat }) => {
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
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTyping = useCallback(() => {
    emitTyping(chatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(chatId, false);
    }, 2000);
  }, [chatId, emitTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

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

    sendMessage(
      {
        chatId,
        content: content.trim(),
        attachments,
        mentions: extractMentions(content)
      },
      (response) => {
        setSending(false);
        if (response?.success) {
          setContent('');
          setAttachments([]);
        } else if (response?.error) {
          alert(response.error);
        }
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {inputDisabled && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-center">
          🔒 المحادثة مقفلة — فقط المشرف يمكنه الإرسال
        </div>
      )}
      {isLocked && !inputDisabled && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
          🔓 المحادثة مقفلة — ولكن يمكنك الإرسال لأنك مشرف
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs">
              <span>📎</span>
              <span className="truncate max-w-[120px]">{att.originalName}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-red-500 hover:text-red-700 mr-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={inputDisabled ? 'المحادثة مقفلة...' : 'اكتب رسالتك... @ للإشارة'}
            rows={1}
            disabled={inputDisabled}
            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#182E4E] resize-none min-h-[40px] max-h-[120px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={inputDisabled}
          className="p-2.5 text-gray-500 hover:text-[#182E4E] hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title="إرفاق ملف"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx,.txt"
        />

        <button
          onClick={handleSend}
          disabled={(!content.trim() && !attachments.length) || sending || inputDisabled}
          className="p-2.5 bg-[#182E4E] text-white rounded-lg hover:bg-[#152842] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
