'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Users, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import ConversationItem from './ConversationItem';
import NewChatModal from '@/components/modals/NewChatModal';
import FriendsModal from '@/components/modals/FriendsModal';
import ProfileModal from '@/components/modals/ProfileModal';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api';
import { Conversation } from '@/types';

export default function Sidebar() {
  const { user } = useAuthStore();
  const {
    conversations,
    setConversations,
    pendingFriendRequestsCount,
    setPendingFriendRequestsCount,
  } = useChatStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [convRes, reqRes] = await Promise.all([
          api.get<{ data: Conversation[] }>('/conversations'),
          api.get<{ data: any[] }>('/friends/requests'),
        ]);
        setConversations(convRes.data.data || []);
        setPendingFriendRequestsCount(reqRes.data.data?.length || 0);
      } catch (err) {
        console.error('Failed to fetch initial sidebar data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [setConversations, setPendingFriendRequestsCount]);

  const filteredConversations = conversations.filter((c) => {
    const name = c.is_group
      ? c.name
      : c.members?.find((m) => m.id !== user?.id)?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-80 flex-shrink-0 bg-[#1a1a2e] flex flex-col h-full border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-lg">ChatApp</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="Tạo cuộc trò chuyện mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-2 bg-white/10 text-white placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-white/10"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              {search ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-3 text-indigo-400 text-xs hover:text-indigo-300 underline underline-offset-2"
              >
                Bắt đầu trò chuyện mới
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 flex-1 min-w-0 p-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <Avatar name={user?.name || ''} avatarUrl={user?.avatar_url} size="sm" isOnline={true} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </button>

        <button
          onClick={() => setShowFriends(true)}
          className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          title="Bạn bè"
        >
          <Users className="w-5 h-5" />
          {pendingFriendRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#1a1a2e] animate-pulse">
              {pendingFriendRequestsCount > 99 ? '99+' : pendingFriendRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowProfile(true)}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          title="Hồ sơ"
        >
          <UserIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Modals */}
      <NewChatModal isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
      <FriendsModal isOpen={showFriends} onClose={() => setShowFriends(false)} />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
