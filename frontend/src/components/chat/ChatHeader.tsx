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
    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-white/95 backdrop-blur-xs shadow-xs">
      <Avatar
        name={displayName}
        avatarUrl={displayAvatar}
        isOnline={isOnline}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-slate-800 truncate text-[15px]">{displayName}</h2>
        <p className="text-xs text-slate-400">
          {conversation.is_group ? (
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3 h-3" />
              {memberCount} thành viên
            </span>
          ) : isOnline ? (
            <span className="text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Đang hoạt động
            </span>
          ) : (
            'Không hoạt động'
          )}
        </p>
      </div>
    </div>
  );
}
