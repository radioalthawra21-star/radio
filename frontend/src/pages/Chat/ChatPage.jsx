import { useState, useCallback, useEffect } from 'react';
import ChatList from '../../components/chat/ChatList';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatDetails from '../../components/chat/ChatDetails';
import { useChat } from '../../context/ChatContext';

export const ChatWidget = () => {
  const { activeChat, setActiveChat } = useChat();
  const [showDetails, setShowDetails] = useState(false);
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0);
  const [showList, setShowList] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = useCallback((chat) => {
    setActiveChat(chat);
    setShowDetails(false);
    setShowList(false);
  }, [setActiveChat]);

  const handleBackToList = useCallback(() => {
    setShowList(true);
    setShowDetails(false);
  }, []);

  const handleMessageSent = useCallback(() => {
    setChatListRefreshKey(k => k + 1);
  }, []);

  // On mobile, show list OR messages, not both
  const showChatList = isMobile ? showList : true;
  const showMessages = isMobile ? !showList && activeChat : !!activeChat;

  return (
    <div className="flex h-full bg-gray-50 rounded-xl shadow-sm border border-gray-200" dir="rtl">
      <div className={`${isMobile ? (showList ? 'flex w-full' : 'hidden') : 'flex'} h-full`}>
        <ChatList
          onChatSelect={handleChatSelect}
          activeChatId={activeChat?._id}
          refreshKey={chatListRefreshKey}
        />
      </div>
      {showMessages ? (
        <div className={`${isMobile ? 'flex w-full' : 'flex flex-1'} h-full`}>
          <ChatMessages
            chat={activeChat}
            onToggleDetails={() => setShowDetails(!showDetails)}
            onMessageSent={handleMessageSent}
            onBack={handleBackToList}
          />
        </div>
      ) : !showChatList ? null : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-white min-w-0">
          <div className="text-center text-gray-400">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">اختر محادثة للبدء</p>
            <p className="text-sm mt-1">من القائمة الجانبية اختر المحادثة التي تريد</p>
          </div>
        </div>
      )}
      {/* Chat Details Panel - full screen on mobile, side panel on desktop */}
      {showDetails && activeChat && (
        <div className={`${isMobile ? 'fixed inset-0 z-50' : ''} overflow-hidden flex-shrink-0`}>
          <div className={`${isMobile ? 'w-full h-full' : 'w-72'} h-full bg-white border-r border-gray-200`}>
            {isMobile && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-gray-800">تفاصيل المحادثة</h3>
                <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500" aria-label="إغلاق التفاصيل">✕</button>
              </div>
            )}
            <div className={isMobile ? 'h-[calc(100%-56px)]' : 'h-full'}>
              <ChatDetails chat={activeChat} onClose={() => setShowDetails(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChatPage = () => {
  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      <ChatWidget />
    </div>
  );
};

export default ChatPage;