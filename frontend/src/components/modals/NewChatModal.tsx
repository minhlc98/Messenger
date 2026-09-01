'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Conversation, User } from '@/types';
import { useChatStore } from '@/store/chat';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Search, Users, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const router = useRouter();
  const { addConversation, conversations } = useChatStore();
  const [friends, setFriends] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api.get<{ data: User[] }>('/friends').then((res) => {
      setFriends(res.data.data || []);
    }).catch(() => {});
    setSelected([]);
    setSearch('');
    setGroupName('');
  }, [isOpen]);

  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (user: User) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const isSelected = (userId: string) => selected.some((u) => u.id === userId);

  const handleCreate = async () => {
    if (selected.length === 0) return;

    // Chat 1-1: mở màn hình chat tạm (chưa tạo DB)
    if (selected.length === 1) {
      const targetUser = selected[0];
      const existing = conversations.find(
        (c) => !c.is_group && c.members?.some((m) => m.id === targetUser.id)
      );

      onClose();
      if (existing) {
        router.push(`/chat/${existing.id}`);
      } else {
        router.push(`/chat/user-${targetUser.id}`);
      }
      return;
    }

    // Nhóm chat (2 người trở lên): tạo nhóm trên server
    setIsCreating(true);
    try {
      const payload = {
        is_group: true,
        member_ids: selected.map((u) => u.id),
        name: groupName || `Nhóm ${selected.map((u) => u.name).join(', ')}`,
      };
      const res = await api.post<{ data: Conversation }>('/conversations', payload);
      addConversation(res.data.data);
      onClose();
      router.push(`/chat/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Tạo cuộc trò chuyện thất bại');
    } finally {
      setIsCreating(false);
    }
  };

  const isGroup = selected.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cuộc trò chuyện mới" size="md">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bạn bè..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((u) => (
            <span
              key={u.id}
              onClick={() => toggleSelect(u)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs cursor-pointer hover:bg-indigo-200 transition-colors"
            >
              {u.name}
              <span className="text-indigo-400">×</span>
            </span>
          ))}
        </div>
      )}

      {/* Group name input */}
      {isGroup && (
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Tên nhóm (tuỳ chọn)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
        />
      )}

      {/* Friends list */}
      <div className="max-h-60 overflow-y-auto scrollbar-chat space-y-1 mb-4">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">
            {friends.length === 0 ? 'Chưa có bạn bè. Hãy thêm bạn trước!' : 'Không tìm thấy'}
          </p>
        ) : (
          filtered.map((user) => (
            <button
              key={user.id}
              onClick={() => toggleSelect(user)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                isSelected(user.id)
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Avatar name={user.name} avatarUrl={user.avatar_url} isOnline={user.is_online} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {isSelected(user.id) && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <Button
        onClick={handleCreate}
        disabled={selected.length === 0}
        isLoading={isCreating}
        className="w-full justify-center"
      >
        {isGroup ? (
          <><Users className="w-4 h-4" /> Tạo nhóm ({selected.length} người)</>
        ) : (
          <><MessageCircle className="w-4 h-4" /> Bắt đầu trò chuyện</>
        )}
      </Button>
    </Modal>
  );
}
