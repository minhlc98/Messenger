import { Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { Users } from 'lucide-react';

interface ChatHeaderProps {
  conversation: Conversation;
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const { user } = useAuthStore();
  const onlineUsers = useChatStore((state) => state.onlineUsers);

  const otherMember = !conversation.is_group
    ? conversation.members?.find((m) => m.id !== user?.id)
    : null;

  const displayName = conversation.is_group
    ? conversation.name || 'Nhóm chat'
    : otherMember?.name || 'Unknown';

  const displayAvatar = conversation.is_group ? conversation.avatar_url : otherMember?.avatar_url;
  const isOnline = !conversation.is_group && otherMember 
    ? (onlineUsers[otherMember.id] ?? otherMember.is_online) 
    : undefined;
  const memberCount = conversation.members?.length || 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
      <Avatar
        name={displayName}
        avatarUrl={displayAvatar}
        isOnline={isOnline}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900 truncate">{displayName}</h2>
        <p className="text-xs text-gray-400">
          {conversation.is_group ? (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {memberCount} thành viên
            </span>
          ) : isOnline ? (
            <span className="text-green-500">Đang hoạt động</span>
          ) : (
            'Không hoạt động'
          )}
        </p>
      </div>
    </div>
  );
}
