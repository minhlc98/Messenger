export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  is_online: boolean;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: User;
  addressee?: User;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string;
  avatar_url: string;
  created_by: string;
  created_at: string;
  last_message?: Message;
  members?: User[];
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'audio' | 'file' | 'system';
  content: string;
  file_url: string;
  created_at: string;
  sender?: User;
}

export interface WSMessage {
  type: 'message' | 'typing' | 'read' | 'online' | 'offline' | 'new_conversation' | 'friend_request';
  conversation_id?: string;
  conversation?: Conversation;
  message?: Message;
  user_id?: string;
  message_type?: string;
  content?: string;
  data?: {
    requester_id?: string;
    message?: string;
    [key: string]: any;
  };
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
