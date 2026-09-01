import { Message, User } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatMessageTime, getAvatarUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  isGroup: boolean;
}

export default function MessageBubble({ message, showAvatar, isGroup }: MessageBubbleProps) {
  const { user } = useAuthStore();

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 message-enter">
        <span className="px-3.5 py-1 bg-gray-100/90 text-gray-500 rounded-full text-xs font-medium border border-gray-200/50 shadow-xs">
          {message.content}
        </span>
      </div>
    );
  }

  const isOwn = message.sender_id === user?.id;
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';

  return (
    <div className={cn('flex items-end gap-2 mb-1 message-enter', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar (only for others in group chat) */}
      {!isOwn && isGroup && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar
              name={message.sender?.name || 'User'}
              avatarUrl={message.sender?.avatar_url}
              size="sm"
            />
          )}
        </div>
      )}

      <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (only in group, for others) */}
        {!isOwn && isGroup && showAvatar && (
          <span className="text-xs text-gray-500 mb-1 ml-1">{message.sender?.name}</span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl text-sm leading-relaxed',
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
          )}
        >
          {message.type === 'text' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

          {message.type === 'image' && message.file_url && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${apiBase}${message.file_url}`}
                alt="image"
                className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(`${apiBase}${message.file_url}`, '_blank')}
              />
              {message.content && (
                <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          )}

          {message.type === 'audio' && message.file_url && (
            <audio controls className="max-w-xs">
              <source src={`${apiBase}${message.file_url}`} />
            </audio>
          )}

          {message.type === 'file' && message.file_url && (
            <a
              href={`${apiBase}${message.file_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 underline underline-offset-2',
                isOwn ? 'text-indigo-100' : 'text-indigo-600'
              )}
            >
              📎 {message.content || 'Tệp đính kèm'}
            </a>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-0.5 px-1">
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
