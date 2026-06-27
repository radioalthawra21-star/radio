import { useState, useCallback } from 'react';
import ChatList from '../../components/chat/ChatList';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatDetails from '../../components/chat/ChatDetails';
import { useChat } from '../../context/ChatContext';

export const ChatWidget = () => {
  const { activeChat, setActiveChat } = useChat();
  const [showDetails, setShowDetails] = useState(false);
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0);

  const handleChatSelect = useCallback((chat) => {
    setActiveChat(chat);
    setShowDetails(false);
  }, [setActiveChat]);

  const handleMessageSent = useCallback(() => {
    setChatListRefreshKey(k => k + 1);
  }, []);

  return (
    <div className="flex h-full bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-200" dir="rtl">
      <ChatList
        onChatSelect={handleChatSelect}
        activeChatId={activeChat?._id}
        refreshKey={chatListRefreshKey}
      />
      {activeChat ? (
        <ChatMessages
          chat={activeChat}
          onToggleDetails={() => setShowDetails(!showDetails)}
          onMessageSent={handleMessageSent}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white min-w-0">
          <div className="text-center text-gray-400">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">اختر محادثة للبدء</p>
            <p className="text-sm mt-1">من القائمة الجانبية اختر المحادثة التي تريد</p>
          </div>
        </div>
      )}
      <div
        className={`overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out ${
          showDetails && activeChat ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: showDetails && activeChat ? '18rem' : '0' }}
      >
        {activeChat && (
          <ChatDetails chat={activeChat} onClose={() => setShowDetails(false)} />
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  return (
    <div className="h-[calc(100vh-5rem)]">
      <ChatWidget />
    </div>
  );
};

export default ChatPage;