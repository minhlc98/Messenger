'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Friendship, User, Conversation } from '@/types';
import { useChatStore } from '@/store/chat';
import api from '@/lib/api';
import { Search, UserPlus, Check, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'friends' | 'requests' | 'add';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const router = useRouter();
  const { addConversation, conversations, setPendingFriendRequestsCount } = useChatStore();

  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchFriends();
    fetchRequests();
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const res = await api.get<{ data: User[] }>('/friends');
      setFriends(res.data.data || []);
    } catch {}
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get<{ data: Friendship[] }>('/friends/requests');
      const reqList = res.data.data || [];
      setRequests(reqList);
      setPendingFriendRequestsCount(reqList.length);
    } catch {}
  };

  // Mở chat 1-1 với bạn bè: tìm conversation có sẵn hoặc mở màn hình chat tạm (chưa tạo DB)
  const handleStartChat = (friend: User) => {
    // Tìm conversation 1-1 với bạn này trong store
    const existing = conversations.find(
      (c) => !c.is_group && c.members?.some((m) => m.id === friend.id)
    );

    onClose();
    if (existing) {
      router.push(`/chat/${existing.id}`);
    } else {
      router.push(`/chat/user-${friend.id}`);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const res = await api.get<{ data: User[] }>(`/users/search?email=${encodeURIComponent(searchEmail)}`);
      const users = res.data.data || [];
      if (users.length > 0) {
        setSearchResult(users[0]);
      } else {
        setSearchError('Không tìm thấy người dùng');
      }
    } catch {
      setSearchError('Không tìm thấy người dùng');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setIsSending(true);
    try {
      await api.post('/friends/request', { addressee_id: userId });
      setSearchResult(null);
      setSearchEmail('');
      setSearchError('');
      toast.success('Đã gửi lời mời kết bạn!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gửi lời mời thất bại');
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (req: Friendship) => {
    try {
      await api.put(`/friends/requests/${req.id}/accept`);
      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== req.id);
        setPendingFriendRequestsCount(updated.length);
        return updated;
      });
      fetchFriends();
    } catch {}
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/friends/requests/${id}/reject`);
      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        setPendingFriendRequestsCount(updated.length);
        return updated;
      });
    } catch {}
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'friends', label: 'Bạn bè', count: friends.length },
    { key: 'requests', label: 'Lời mời', count: requests.length },
    { key: 'add', label: 'Thêm bạn' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bạn bè" size="md">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 -mt-2 mb-4">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Bạn bè ── */}
      {tab === 'friends' && (
        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-chat">
          {friends.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Chưa có bạn bè nào</p>
              <button
                onClick={() => setTab('add')}
                className="mt-2 text-indigo-500 text-xs hover:underline"
              >
                Thêm bạn ngay →
              </button>
            </div>
          ) : (
            friends.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} isOnline={user.is_online} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs ${user.is_online ? 'text-green-500' : 'text-gray-300'}`}>
                    {user.is_online ? '● Online' : '● Offline'}
                  </span>
                  {/* Nút nhắn tin */}
                  <button
                    onClick={() => handleStartChat(user)}
                    title="Nhắn tin"
                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Lời mời ── */}
      {tab === 'requests' && (
        <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-chat">
          {requests.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Không có lời mời nào</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                <Avatar name={req.requester?.name || 'User'} avatarUrl={req.requester?.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.requester?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{req.requester?.email}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAccept(req)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                    title="Chấp nhận"
                  >
                    <Check className="w-3.5 h-3.5" /> Chấp nhận
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                    title="Từ chối"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Thêm bạn ── */}
      {tab === 'add' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Nhập email bạn bè..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button onClick={handleSearch} isLoading={isSearching} size="md">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searchError && (
            <p className="text-red-500 text-sm text-center py-4">{searchError}</p>
          )}

          {searchResult && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Avatar name={searchResult.name} avatarUrl={searchResult.avatar_url} isOnline={searchResult.is_online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{searchResult.name}</p>
                <p className="text-xs text-gray-400">{searchResult.email}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSendRequest(searchResult.id)}
                isLoading={isSending}
              >
                <UserPlus className="w-4 h-4" />
                Kết bạn
              </Button>
            </div>
          )}

          {/* Hướng dẫn */}
          {!searchResult && !searchError && (
            <p className="text-xs text-gray-400 text-center mt-6">
              Nhập chính xác email để tìm kiếm bạn bè
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
