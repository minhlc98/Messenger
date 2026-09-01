'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatArea from '@/components/chat/ChatArea';
import { Conversation, User } from '@/types';
import api from '@/lib/api';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const conversationId = params.conversationId as string;

  // Dùng selector — chỉ re-render khi conversation này thay đổi, không phải cả list
  const conversationFromStore = useChatStore(
    (state) => state.conversations.find((c) => c.id === conversationId)
  );

  const [conversation, setConversation] = useState<Conversation | null>(
    conversationFromStore ?? null
  );
  const [loading, setLoading] = useState(!conversationFromStore);

  useEffect(() => {
    if (conversationFromStore) {
      setConversation(conversationFromStore);
      setLoading(false);
      return;
    }

    // Xử lý cuộc trò chuyện tạm (draft chat 1-1 chưa tạo trên DB)
    if (conversationId.startsWith('user-')) {
      const targetUserId = conversationId.replace('user-', '');
      const existing = useChatStore.getState().conversations.find(
        (c) => !c.is_group && c.members?.some((m) => m.id === targetUserId)
      );

      if (existing) {
        router.replace(`/chat/${existing.id}`);
        return;
      }

      const fetchUser = async () => {
        try {
          const res = await api.get<{ data: User }>(`/users/${targetUserId}`);
          const targetUser = res.data.data;
          const draftConv: Conversation = {
            id: conversationId,
            is_group: false,
            name: targetUser.name,
            avatar_url: targetUser.avatar_url,
            created_by: currentUser?.id || '',
            created_at: new Date().toISOString(),
            members: currentUser && targetUser ? [currentUser, targetUser] : [targetUser],
          };
          setConversation(draftConv);
        } catch {
          router.replace('/chat');
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
      return;
    }

    // Conversation bình thường → fetch từ API
    const fetch = async () => {
      try {
        const res = await api.get<{ data: Conversation }>(`/conversations/${conversationId}`);
        setConversation(res.data.data);
      } catch {
        router.replace('/chat');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [conversationId, conversationFromStore, currentUser, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!conversation) return null;

  return <ChatArea conversation={conversation} />;
}
