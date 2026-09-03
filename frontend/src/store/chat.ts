import { create } from 'zustand';
import { Conversation, Message } from '@/types';

interface TypingState {
  [conversationId: string]: string[]; // array of userIds typing
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: TypingState;
  hasMore: Record<string, boolean>;
  onlineUsers: Record<string, boolean>;
  pendingFriendRequestsCount: number;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setHasMore: (conversationId: string, hasMore: boolean) => void;
  setOnlineUser: (userId: string, isOnline: boolean) => void;
  setPendingFriendRequestsCount: (count: number) => void;
  incrementPendingFriendRequestsCount: () => void;
  decrementPendingFriendRequestsCount: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  hasMore: {},
  onlineUsers: {},
  pendingFriendRequestsCount: 0,

  setPendingFriendRequestsCount: (count) => set({ pendingFriendRequestsCount: count }),
  incrementPendingFriendRequestsCount: () =>
    set((state) => ({ pendingFriendRequestsCount: state.pendingFriendRequestsCount + 1 })),
  decrementPendingFriendRequestsCount: () =>
    set((state) => ({
      pendingFriendRequestsCount: Math.max(0, state.pendingFriendRequestsCount - 1),
    })),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((state) => {
      const filtered = state.conversations.filter((c) => c.id !== conv.id);
      return {
        conversations: [conv, ...filtered],
      };
    }),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) return state;

      const updatedConv: Conversation = { ...conv, last_message: message };
      const remainingConvs = state.conversations.filter((c) => c.id !== conversationId);
      return {
        conversations: [updatedConv, ...remainingConvs],
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  prependMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...messages, ...(state.messages[conversationId] || [])],
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? current.includes(userId) ? current : [...current, userId]
        : current.filter((id) => id !== userId);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: updated },
      };
    }),

  setHasMore: (conversationId, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
    })),

  setOnlineUser: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: isOnline },
    })),
}));
