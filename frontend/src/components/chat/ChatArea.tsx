'use client';

import { useEffect, useRef, useState, UIEvent } from 'react';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import MessageBubble, { BubblePosition } from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { Conversation, Message } from '@/types';
import api from '@/lib/api';
import { Users } from 'lucide-react';
import { isToday, isYesterday, format, isSameDay } from 'date-fns';
import GroupDetailModal from '@/components/modals/GroupDetailModal';

interface ChatAreaProps {
  conversation: Conversation;
}

/** Format a date stamp for the day-divider label */
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hôm nay';
  if (isYesterday(d)) return 'Hôm qua';
  return format(d, 'dd/MM/yyyy');
}

/** Compute bubble corner position within a consecutive sender-run */
function getBubblePosition(
  messages: Message[],
  idx: number
): BubblePosition {
  const msg = messages[idx];
  const prev = idx > 0 ? messages[idx - 1] : null;
  const next = idx < messages.length - 1 ? messages[idx + 1] : null;

  const samePrev = prev && prev.sender_id === msg.sender_id && prev.type !== 'system';
  const sameNext = next && next.sender_id === msg.sender_id && next.type !== 'system';

  if (!samePrev && !sameNext) return 'single';
  if (!samePrev && sameNext) return 'first';
  if (samePrev && sameNext) return 'middle';
  return 'last';
}

export default function ChatArea({ conversation }: ChatAreaProps) {
  const { messages, setMessages, typingUsers, setHasMore, hasMore, prependMessages } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
        const fetchedMessages = res.data.data || [];
        setMessages(conversation.id, fetchedMessages);
        if (fetchedMessages.length < 50) {
          setHasMore(conversation.id, false);
        } else {
          setHasMore(conversation.id, true);
        }
      } catch { }
      setLoading(false);
    };
    fetch();
  }, [conversation.id, setMessages, setHasMore]);

  // Handle scroll to top
  const handleScroll = async (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop === 0 && !loadingMore && !loading && convMessages.length > 0 && hasMore[conversation.id] !== false) {
      setLoadingMore(true);
      const firstMsgId = convMessages[0].id;
      
      try {
        const res = await api.get<{ data: Message[] }>(
          `/conversations/${conversation.id}/messages?limit=50&before=${firstMsgId}`
        );
        
        const olderMessages = res.data.data || [];
        if (olderMessages.length < 50) {
          setHasMore(conversation.id, false);
        } else {
          setHasMore(conversation.id, true);
        }
        
        if (olderMessages.length > 0) {
          const scrollHeightBefore = target.scrollHeight;
          prependMessages(conversation.id, olderMessages);
          
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const scrollHeightAfter = scrollContainerRef.current.scrollHeight;
              scrollContainerRef.current.scrollTop = scrollHeightAfter - scrollHeightBefore;
            }
          });
        }
      } catch { }
      
      setLoadingMore(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center pt-3 pb-6 text-center select-none">
        <div
          onClick={() => setShowGroupModal(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 border border-indigo-200/60 flex items-center justify-center mb-3 shadow-xs text-indigo-600 cursor-pointer hover:scale-105 hover:shadow-md transition-all"
          title="Xem thông tin & thành viên nhóm"
        >
          <Users className="w-7 h-7" />
        </div>
        <h3
          onClick={() => setShowGroupModal(true)}
          className="text-base font-bold text-slate-800 mb-1 tracking-tight cursor-pointer hover:text-indigo-600 transition-colors"
          title="Xem thông tin & thành viên nhóm"
        >
          {conversation.name || 'Nhóm chat'}
        </h3>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-xs text-slate-600 rounded-full text-xs font-medium border border-slate-200/70 shadow-xs">
          <span className="font-semibold text-slate-800">{creatorName}</span> đã tạo nhóm này
        </div>
        {conversation.created_at && (
          <span className="text-[11px] text-slate-400 mt-1.5 font-medium">
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
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <ChatHeader
        conversation={conversation}
        onOpenGroupDetail={() => setShowGroupModal(true)}
      />

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto scrollbar-chat px-4 sm:px-6 py-4"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            {renderGroupBanner()}
            <p className="text-slate-400 text-sm mt-2">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          <>
            {renderGroupBanner()}

            {loadingMore && (
              <div className="flex items-center justify-center py-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {convMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? convMessages[idx - 1] : null;
              const showAvatar =
                !prevMsg ||
                prevMsg.sender_id !== msg.sender_id ||
                prevMsg.type === 'system';

              const position = getBubblePosition(convMessages, idx);

              // Show date divider when day changes
              const showDateDivider =
                msg.type !== 'system' &&
                (!prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at)));

              return (
                <div key={msg.id}>
                  {showDateDivider && (
                    <div className="flex items-center gap-3 my-4 select-none">
                      <div className="flex-1 h-px bg-slate-200/70" />
                      <span className="px-3 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-full border border-slate-200/60 shadow-xs whitespace-nowrap">
                        {formatDayLabel(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-slate-200/70" />
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    showAvatar={showAvatar}
                    isGroup={conversation.is_group}
                    position={position}
                  />
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingNames.length > 0 && (
              <div className="flex items-center gap-2 mt-2 ml-1">
                <div className="flex items-center gap-1 px-3.5 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-400 italic">
                  {typingNames.join(', ')} đang nhập...
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <MessageInput conversationId={conversation.id} />

      {conversation.is_group && (
        <GroupDetailModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          conversation={conversation}
        />
      )}
    </div>
  );
}

