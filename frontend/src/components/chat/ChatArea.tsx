'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { Conversation, Message } from '@/types';
import api from '@/lib/api';
import { Users } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation;
}

export default function ChatArea({ conversation }: ChatAreaProps) {
  const { messages, setMessages, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const convMessages = messages[conversation.id] || [];
  const typingInConv = (typingUsers[conversation.id] || []).filter((id) => id !== user?.id);

  const creator = conversation.is_group
    ? conversation.members?.find((m) => m.id === conversation.created_by)
    : null;
  const isCreator = conversation.created_by === user?.id;
  const creatorName = isCreator ? 'Bạn' : (creator?.name || 'Người dùng');

  // Fetch messages on mount or conversation change
  useEffect(() => {
    isFirstLoad.current = true;
    if (conversation.id.startsWith('user-')) {
      setMessages(conversation.id, []);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: Message[] }>(
          `/conversations/${conversation.id}/messages?limit=50`
        );
        setMessages(conversation.id, res.data.data || []);
      } catch { }
      setLoading(false);
    };
    fetch();
  }, [conversation.id, setMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: isFirstLoad.current ? 'instant' : 'smooth',
      });
      isFirstLoad.current = false;
    }
  }, [convMessages.length]);

  // Get typing user names
  const typingNames = typingInConv
    .map((id) => conversation.members?.find((m) => m.id === id)?.name || 'Ai đó')
    .slice(0, 2);

  const renderGroupBanner = () => {
    if (!conversation.is_group) return null;
    return (
      <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-2.5 shadow-sm text-indigo-600">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {conversation.name || 'Nhóm chat'}
        </h3>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100/90 text-gray-600 rounded-full text-xs font-medium border border-gray-200/50">
          <span className="font-semibold text-gray-800">{creatorName}</span> đã tạo nhóm này
        </div>
        {conversation.created_at && (
          <span className="text-[11px] text-gray-400 mt-1.5">
            {new Date(conversation.created_at).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-chat px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            {renderGroupBanner()}
            <p className="text-gray-400 text-sm mt-2">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          <>
            {renderGroupBanner()}

            {convMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? convMessages[idx - 1] : null;
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  showAvatar={showAvatar}
                  isGroup={conversation.is_group}
                />
              );
            })}

            {/* Typing indicator */}
            {typingNames.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-0.5 px-3 py-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing" style={{ animationDelay: '400ms' }} />
                </div>
                <span className="text-xs text-gray-400">
                  {typingNames.join(', ')} đang nhập...
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <MessageInput conversationId={conversation.id} />
    </div>
  );
}
