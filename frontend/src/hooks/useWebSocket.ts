'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { WSMessage, Conversation } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
const RECONNECT_DELAY = 3000;

// Singleton WebSocket — module-level, shared across app
let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;

// Expose send functions globally so components can call without re-connecting
type SendFn = (data: object) => void;
let globalSend: SendFn = () => { };

export function getWsSend(): SendFn {
  return globalSend;
}

// Hook dùng ở MainLayout — khởi tạo kết nối 1 lần duy nhất
export function useWebSocketInit() {
  const { token } = useAuthStore();
  const {
    addMessage,
    updateConversationLastMessage,
    setTyping,
    addConversation,
    setOnlineUser,
    incrementPendingFriendRequestsCount,
  } = useChatStore();

  const connect = useCallback(() => {
    if (!token) return;
    if (isConnecting) return;
    if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) return;

    isConnecting = true;
    wsInstance = new WebSocket(`${WS_URL}?token=${token}`);

    wsInstance.onopen = () => {
      isConnecting = false;
      console.log('[WS] Connected');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      // Gán hàm send toàn cục
      globalSend = (data: object) => {
        if (wsInstance?.readyState === WebSocket.OPEN) {
          wsInstance.send(JSON.stringify(data));
        }
      };
    };

    wsInstance.onmessage = async (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        switch (data.type) {
          case 'new_conversation':
            if (data.conversation) {
              addConversation(data.conversation);
            }
            break;

          case 'message':
            if (data.message && data.conversation_id) {
              addMessage(data.conversation_id, data.message);
              updateConversationLastMessage(data.conversation_id, data.message);

              // Nếu conversation chưa có trong store (phòng trường hợp người nhận chưa có conversation trên UI)
              const currentConversations = useChatStore.getState().conversations;
              const exists = currentConversations.some((c) => c.id === data.conversation_id);
              if (!exists) {
                try {
                  const res = await api.get<{ data: Conversation }>(`/conversations/${data.conversation_id}`);
                  if (res.data?.data) {
                    const newConv: Conversation = {
                      ...res.data.data,
                      last_message: data.message,
                    };
                    addConversation(newConv);
                  }
                } catch (e) {
                  console.error('[WS] Failed to fetch new conversation info:', e);
                }
              }
            }
            break;

          case 'typing':
            if (data.conversation_id && data.user_id) {
              setTyping(data.conversation_id, data.user_id, true);
              setTimeout(() => setTyping(data.conversation_id!, data.user_id!, false), 1500);
            }
            break;

          case 'friend_request':
            incrementPendingFriendRequestsCount();
            toast.info(data.data?.message || 'Bạn có một lời mời kết bạn mới!', {
              description: 'Kiểm tra mục Bạn bè để xem và phản hồi.',
            });
            break;

          case 'online':
          case 'offline':
            if (data.user_id) {
              setOnlineUser(data.user_id, data.type === 'online');
            }
            break;
        }
      } catch (err) {
        console.error('[WS] parse error:', err);
      }
    };

    wsInstance.onclose = () => {
      isConnecting = false;
      wsInstance = null;
      globalSend = () => { };
      console.log('[WS] Disconnected, reconnecting...');
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
    };

    wsInstance.onerror = () => {
      isConnecting = false;
      wsInstance?.close();
    };
  }, [token, addMessage, updateConversationLastMessage, setTyping, addConversation, setOnlineUser]);

  useEffect(() => {
    if (token) connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [token, connect]);
}

// Hook nhẹ dùng ở components con — chỉ lấy send functions
export function useWebSocket() {
  const sendMessage = useCallback(
    (conversationId: string, content: string, messageType = 'text') => {
      getWsSend()({ type: 'message', conversation_id: conversationId, content, message_type: messageType });
    },
    []
  );

  // Throttle typing: chỉ gửi 1 lần mỗi 2 giây
  const sendTyping = useCallback((conversationId: string) => {
    getWsSend()({ type: 'typing', conversation_id: conversationId });
  }, []);

  const sendRead = useCallback((conversationId: string, messageId: string) => {
    getWsSend()({ type: 'read', conversation_id: conversationId, message_id: messageId });
  }, []);

  return { sendMessage, sendTyping, sendRead };
}
