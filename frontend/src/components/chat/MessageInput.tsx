'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Image, Paperclip } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Message, Conversation } from '@/types';
import { useChatStore } from '@/store/chat';

interface MessageInputProps {
  conversationId: string;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const router = useRouter();
  const { sendMessage: wsSendMessage, sendTyping } = useWebSocket();
  const { addMessage, updateConversationLastMessage, addConversation } = useChatStore();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Throttle: chỉ gửi typing event 1 lần / 2 giây (bỏ qua nếu là draft chat)
  const handleTyping = () => {
    if (conversationId.startsWith('user-')) return;
    if (!isTyping) {
      sendTyping(conversationId);
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || isSending) return;

    setText('');
    setIsSending(true);

    let activeConvId = conversationId;

    // Nếu là chat tạm (draft chat 1-1), tạo conversation trên server trước
    if (conversationId.startsWith('user-')) {
      const targetUserId = conversationId.replace('user-', '');
      try {
        const res = await api.post<{ data: Conversation }>('/conversations', {
          is_group: false,
          member_ids: [targetUserId],
          name: '',
        });
        const realConv = res.data.data;
        addConversation(realConv);
        activeConvId = realConv.id;
        router.replace(`/chat/${realConv.id}`);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Không thể tạo cuộc trò chuyện');
        setIsSending(false);
        return;
      }
    }

    // Gửi message qua WebSocket
    wsSendMessage(activeConvId, content, 'text');
    setIsSending(false);
  }, [text, isSending, conversationId, wsSendMessage, addConversation, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file' | 'audio') => {
    let activeConvId = conversationId;

    if (conversationId.startsWith('user-')) {
      const targetUserId = conversationId.replace('user-', '');
      try {
        const res = await api.post<{ data: Conversation }>('/conversations', {
          is_group: false,
          member_ids: [targetUserId],
          name: '',
        });
        const realConv = res.data.data;
        addConversation(realConv);
        activeConvId = realConv.id;
        router.replace(`/chat/${realConv.id}`);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Không thể tạo cuộc trò chuyện');
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', activeConvId);
    formData.append('type', type);

    try {
      const res = await api.post<{ data: Message }>(
        `/conversations/${activeConvId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      addMessage(activeConvId, res.data.data);
      updateConversationLastMessage(activeConvId, res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload thất bại');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'image');
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'file');
    e.target.value = '';
  };

  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-white shadow-xs">
      <div className="flex items-end gap-2 bg-slate-50/80 rounded-2xl border border-slate-200/80 px-3.5 py-2 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100/60 transition-all duration-150">
        {/* Attachment buttons */}
        <div className="flex gap-1 pb-0.5">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/50 transition-colors"
            title="Gửi hình ảnh"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/50 transition-colors"
            title="Gửi tệp"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 overflow-y-auto leading-relaxed py-1"
          style={{ minHeight: '24px' }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white rounded-xl shadow-xs shadow-indigo-500/20 disabled:shadow-none transition-all flex-shrink-0 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
