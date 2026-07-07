import { useState, useCallback, useEffect, useRef } from 'react';
import ChatList from '../../components/chat/ChatList';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatDetails from '../../components/chat/ChatDetails';
import { useChat } from '../../context/ChatContext';

export const ChatWidget = () => {
  const { activeChat, setActiveChat, connected, unreadTotal } = useChat();
  const [showDetails, setShowDetails] = useState(false);
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0);
  const [showList, setShowList] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [animating, setAnimating] = useState(false);
  const prevChatId = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = useCallback((chat) => {
    if (chat._id === prevChatId.current) return;
    prevChatId.current = chat._id;
    setAnimating(true);
    setActiveChat(chat);
    setShowDetails(false);
    if (isMobile) {
      setTimeout(() => {
        setShowList(false);
        setAnimating(false);
      }, 50);
    } else {
      setTimeout(() => setAnimating(false), 100);
    }
  }, [setActiveChat, isMobile]);

  const handleBackToList = useCallback(() => {
    setAnimating(true);
    setShowList(true);
    setShowDetails(false);
    setTimeout(() => setAnimating(false), 200);
  }, []);

  const handleMessageSent = useCallback(() => {
    setChatListRefreshKey(k => k + 1);
  }, []);

  const handleToggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  const showChatList = isMobile ? showList : true;
  const showMessages = isMobile ? !showList && activeChat : !!activeChat;

  return (
    <div className="flex h-full bg-[#f0f2f5] rounded-xl shadow-sm border border-gray-200 overflow-hidden relative" dir="rtl">
      <div
        className={`${
          isMobile
            ? showChatList
              ? 'flex w-full animate-fade-in'
              : 'hidden'
            : 'flex flex-shrink-0'
        } h-full transition-all duration-200`}
      >
        <ChatList
          onChatSelect={handleChatSelect}
          activeChatId={activeChat?._id}
          refreshKey={chatListRefreshKey}
        />
      </div>

      {showMessages ? (
        <div
          className={`${
            isMobile ? 'flex w-full animate-slide-in' : 'flex flex-1 min-w-0'
          } h-full transition-all duration-200`}
        >
          <ChatMessages
            chat={activeChat}
            onToggleDetails={handleToggleDetails}
            onMessageSent={handleMessageSent}
            onBack={handleBackToList}
          />
        </div>
      ) : !showChatList ? null : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-[#f0f2f5] min-w-0">
          <div className="text-center">
            <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white shadow-sm flex items-center justify-center">
              <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">محادثات راديو الثورة</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              اختر محادثة من القائمة الجانبية للبدء، أو أنشئ محادثة جديدة للتواصل مع فريق العمل
            </p>
          </div>
        </div>
      )}

      {showDetails && activeChat && (
        <div
          className={`${
            isMobile
              ? 'fixed inset-0 z-50 animate-slideInLeft'
              : 'relative flex-shrink-0 max-w-xs lg:max-w-sm'
          } overflow-hidden transition-all duration-200`}
        >
          <div className={`${isMobile ? 'w-full h-full' : 'w-72 max-w-full'} h-full`}>
            <ChatDetails chat={activeChat} onClose={() => setShowDetails(false)} />
          </div>
        </div>
      )}

      <div className={`fixed bottom-4 left-4 z-40 transition-all duration-300 ${connected ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-gray-200">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] text-gray-500">متصل</span>
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { connected } = useChat();

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] relative">
      <ChatWidget />
    </div>
  );
};

export default ChatPage;
