'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatConversationTime, truncate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isActive = pathname === `/chat/${conversation.id}`;

  // For 1-1 chat, show the other person's info
  const otherMember = !conversation.is_group
    ? conversation.members?.find((m) => m.id !== user?.id)
    : null;

  const displayName = conversation.is_group
    ? conversation.name || 'Nhóm chat'
    : otherMember?.name || 'Unknown';

  const displayAvatar = conversation.is_group ? conversation.avatar_url : otherMember?.avatar_url;
  const isOnline = !conversation.is_group ? otherMember?.is_online : undefined;

  const lastMsg = conversation.last_message;
  const lastMsgText = lastMsg
    ? lastMsg.type === 'text'
      ? truncate(lastMsg.content, 40)
      : lastMsg.type === 'image'
      ? '🖼 Hình ảnh'
      : lastMsg.type === 'audio'
      ? '🎙 Ghi âm'
      : '📎 Tệp đính kèm'
    : 'Bắt đầu trò chuyện';

  const isOwnLastMsg = lastMsg?.sender_id === user?.id;

  return (
    <Link href={`/chat/${conversation.id}`}>
      <div
        className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
          isActive
            ? 'bg-indigo-600/20 border border-indigo-500/30'
            : 'hover:bg-white/5'
        }`}
      >
        <Avatar
          name={displayName}
          avatarUrl={displayAvatar}
          size="md"
          isOnline={isOnline}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-sidebar-text truncate">{displayName}</span>
            <span className="text-xs text-sidebar-muted flex-shrink-0 ml-2">
              {formatConversationTime(lastMsg?.created_at)}
            </span>
          </div>
          <p className="text-xs text-sidebar-muted truncate mt-0.5">
            {isOwnLastMsg && lastMsg ? 'Bạn: ' : ''}
            {lastMsgText}
          </p>
        </div>
        {conversation.unread_count && conversation.unread_count > 0 ? (
          <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center">
            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
