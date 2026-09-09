'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Conversation, User } from '@/types';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Users,
  Search,
  UserPlus,
  Pencil,
  Check,
  X,
  Crown,
  ArrowLeft,
} from 'lucide-react';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onConversationUpdate?: (updated: Conversation) => void;
}

export default function GroupDetailModal({
  isOpen,
  onClose,
  conversation,
  onConversationUpdate,
}: GroupDetailModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { updateConversation, onlineUsers } = useChatStore();

  const [currentConv, setCurrentConv] = useState<Conversation>(conversation);
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Members search
  const [memberSearch, setMemberSearch] = useState('');

  // Add members view
  const [isAddMode, setIsAddMode] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Sync conversation changes
  useEffect(() => {
    setCurrentConv(conversation);
    setGroupNameInput(conversation.name || 'Nhóm chat');
  }, [conversation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditingName(false);
      setIsAddMode(false);
      setMemberSearch('');
      setFriendSearch('');
      setSelectedFriendIds([]);
    } else {
      setGroupNameInput(currentConv.name || 'Nhóm chat');
    }
  }, [isOpen, currentConv.name]);

  // Load friends when entering add mode
  useEffect(() => {
    if (isAddMode) {
      setIsLoadingFriends(true);
      api
        .get<{ data: User[] }>('/friends')
        .then((res) => {
          setFriends(res.data.data || []);
        })
        .catch(() => {
          toast.error('Không thể tải danh sách bạn bè');
        })
        .finally(() => {
          setIsLoadingFriends(false);
        });
    }
  }, [isAddMode]);

  /* ── Rename group ────────────────────────────────────────────── */
  const handleSaveName = async () => {
    const trimmed = groupNameInput.trim();
    if (!trimmed) {
      toast.error('Tên nhóm không được để trống');
      return;
    }
    if (trimmed === currentConv.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await api.put<{ data: Conversation }>(
        `/conversations/${currentConv.id}`,
        { name: trimmed }
      );
      const updated = res.data.data;
      setCurrentConv(updated);
      updateConversation(updated);
      onConversationUpdate?.(updated);
      setIsEditingName(false);
      toast.success('Đã đổi tên nhóm thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Đổi tên nhóm thất bại');
    } finally {
      setIsSavingName(false);
    }
  };

  /* ── Add members ─────────────────────────────────────────────── */
  const toggleSelectFriend = (userId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedFriendIds.length === 0) return;

    setIsAddingMembers(true);
    try {
      const res = await api.post<{ message: string; data: Conversation }>(
        `/conversations/${currentConv.id}/members`,
        { member_ids: selectedFriendIds }
      );

      const updated = res.data.data;
      if (updated) {
        setCurrentConv(updated);
        updateConversation(updated);
        onConversationUpdate?.(updated);
      } else {
        // Fallback: refetch conversation
        const refetch = await api.get<{ data: Conversation }>(
          `/conversations/${currentConv.id}`
        );
        setCurrentConv(refetch.data.data);
        updateConversation(refetch.data.data);
        onConversationUpdate?.(refetch.data.data);
      }

      toast.success('Đã thêm thành viên vào nhóm');
      setIsAddMode(false);
      setSelectedFriendIds([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Thêm thành viên thất bại');
    } finally {
      setIsAddingMembers(false);
    }
  };

  /* ── Filtering ───────────────────────────────────────────────── */
  const members = currentConv.members || [];
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Available friends to add (exclude members already in the group)
  const availableFriends = friends.filter(
    (f) => !members.some((m) => m.id === f.id)
  );

  const filteredFriends = availableFriends.filter(
    (f) =>
      f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.email.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddMode ? 'Thêm thành viên mới' : 'Thông tin nhóm chat'}
      size="md"
    >
      {isAddMode ? (
        /* ── ADD MEMBERS VIEW ────────────────────────────────────── */
        <div>
          <button
            onClick={() => setIsAddMode(false)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách thành viên
          </button>

          {/* Search friend */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Tìm bạn bè để thêm..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
          </div>

          {/* Selected friend chips */}
          {selectedFriendIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto">
              {selectedFriendIds.map((id) => {
                const friend = friends.find((f) => f.id === id);
                if (!friend) return null;
                return (
                  <span
                    key={id}
                    onClick={() => toggleSelectFriend(id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    <span>{friend.name}</span>
                    <span className="text-indigo-400 hover:text-indigo-600">×</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Friends list */}
          <div className="max-h-64 overflow-y-auto scrollbar-chat space-y-1 mb-4">
            {isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : availableFriends.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-slate-500 font-medium">
                  {friends.length === 0
                    ? 'Bạn chưa có bạn bè nào trong danh bạ.'
                    : 'Tất cả bạn bè của bạn đã tham gia nhóm này rồi!'}
                </p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">
                Không tìm thấy bạn bè phù hợp
              </p>
            ) : (
              filteredFriends.map((user) => {
                const selected = selectedFriendIds.includes(user.id);
                const isOnline = onlineUsers[user.id] ?? user.is_online;
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleSelectFriend(user.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      selected
                        ? 'bg-indigo-50/80 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Avatar
                      name={user.name}
                      avatarUrl={user.avatar_url}
                      isOnline={isOnline}
                      size="sm"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'border-2 border-slate-300'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <Button
            onClick={handleAddMembers}
            disabled={selectedFriendIds.length === 0}
            isLoading={isAddingMembers}
            className="w-full justify-center bg-indigo-600 hover:bg-indigo-700"
          >
            <UserPlus className="w-4 h-4" />
            Xác nhận thêm {selectedFriendIds.length > 0 && `(${selectedFriendIds.length})`}
          </Button>
        </div>
      ) : (
        /* ── GROUP INFO & MEMBERS VIEW ───────────────────────────── */
        <div>
          {/* Group Header Card */}
          <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 mb-3">
              <Users className="w-8 h-8" />
            </div>

            {/* Editable Group Name */}
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs mt-1">
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  maxLength={100}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-400 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName || !groupNameInput.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:bg-slate-300"
                  title="Lưu"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setGroupNameInput(currentConv.name || 'Nhóm chat');
                  }}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  title="Hủy"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 group">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  {currentConv.name || 'Nhóm chat'}
                </h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
                  title="Đổi tên nhóm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <span className="text-xs text-slate-400 mt-1">
              {members.length} thành viên • Tạo ngày{' '}
              {new Date(currentConv.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {/* Action: Add member button */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thành viên ({members.length})
            </span>
            <button
              onClick={() => setIsAddMode(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Thêm thành viên
            </button>
          </div>

          {/* Search members */}
          {members.length > 5 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Tìm thành viên trong nhóm..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
              />
            </div>
          )}

          {/* Members list */}
          <div className="max-h-64 overflow-y-auto scrollbar-chat divide-y divide-slate-100 -mx-1 px-1">
            {filteredMembers.map((member) => {
              const isCreator = member.id === currentConv.created_by;
              const isMe = member.id === currentUser?.id;
              const isOnline = onlineUsers[member.id] ?? member.is_online;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      isOnline={isOnline}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {member.name}
                        </span>
                        {isMe && (
                          <span className="text-[11px] text-slate-400 font-normal">
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 truncate block">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {/* Role badges */}
                  <div>
                    {isCreator ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md text-[11px] font-semibold">
                        <Crown className="w-3 h-3 text-amber-500" />
                        Trưởng nhóm
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5">
                        Thành viên
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
