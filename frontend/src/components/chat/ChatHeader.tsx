'use client';

import { useState } from 'react';
import { Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { Users } from 'lucide-react';
import GroupDetailModal from '@/components/modals/GroupDetailModal';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
  onOpenGroupDetail?: () => void;
}

export default function ChatHeader({ conversation, onOpenGroupDetail }: ChatHeaderProps) {
  const { user } = useAuthStore();
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const [internalShowModal, setInternalShowModal] = useState(false);

  const handleOpenModal = () => {
    if (onOpenGroupDetail) {
      onOpenGroupDetail();
    } else {
      setInternalShowModal(true);
    }
  };

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
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-white/95 backdrop-blur-xs shadow-xs select-none">
        {/* Left: Clickable group / user info */}
        <div
          onClick={() => conversation.is_group && handleOpenModal()}
          className={cn(
            'flex items-center gap-3 flex-1 min-w-0',
            conversation.is_group && 'cursor-pointer group'
          )}
        >
          <Avatar
            name={displayName}
            avatarUrl={displayAvatar}
            isOnline={isOnline}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <h2
              className={cn(
                'font-semibold text-slate-800 truncate text-[15px] transition-colors',
                conversation.is_group && 'group-hover:text-indigo-600'
              )}
            >
              {displayName}
            </h2>
            <p className="text-xs text-slate-400">
              {conversation.is_group ? (
                <span className="flex items-center gap-1 font-medium group-hover:text-indigo-500 transition-colors">
                  <Users className="w-3 h-3 text-indigo-500" />
                  {memberCount} thành viên • Bấm để xem chi tiết
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

        {/* Right: Group members button */}
        {conversation.is_group && (
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 bg-white rounded-xl transition-all border border-slate-200 shadow-xs hover:border-indigo-200"
            title="Xem danh sách thành viên & quản trị nhóm"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thành viên</span>
          </button>
        )}
      </div>

      {conversation.is_group && !onOpenGroupDetail && (
        <GroupDetailModal
          isOpen={internalShowModal}
          onClose={() => setInternalShowModal(false)}
          conversation={conversation}
        />
      )}
    </>
  );
}
