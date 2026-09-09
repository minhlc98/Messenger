import { Message } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatMessageTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';

export type BubblePosition = 'single' | 'first' | 'middle' | 'last';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  isGroup: boolean;
  position?: BubblePosition;
}

export default function MessageBubble({
  message,
  isGroup,
  position = 'single',
}: MessageBubbleProps) {
  const { user } = useAuthStore();

  /* ── System message ─────────────────────────────────────────── */
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 message-enter select-none">
        <span className="px-3.5 py-1 bg-slate-100/90 text-slate-500 rounded-full text-xs font-medium border border-slate-200/50 shadow-xs">
          {message.content}
        </span>
      </div>
    );
  }

  const isOwn = message.sender_id === user?.id;
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
  const timeStr = formatMessageTime(message.created_at);

  /* ── Modern chat bubble corner curves based on position in a run ── */
  // Own messages: tail curves into bottom-right
  const cornerOwn = {
    single: 'rounded-[18px] rounded-br-[4px]',
    first: 'rounded-[18px] rounded-br-[5px]',
    middle: 'rounded-[18px] rounded-r-[5px]',
    last: 'rounded-[18px] rounded-tr-[5px] rounded-br-[4px]',
  }[position];

  // Other messages: tail curves into bottom-left
  const cornerOther = {
    single: 'rounded-[18px] rounded-bl-[4px]',
    first: 'rounded-[18px] rounded-bl-[5px]',
    middle: 'rounded-[18px] rounded-l-[5px]',
    last: 'rounded-[18px] rounded-tl-[5px] rounded-bl-[4px]',
  }[position];

  /* ── Margin between messages in same run ───────────────────── */
  const marginTop =
    position === 'first' || position === 'single' ? 'mt-3.5' : 'mt-1.5';

  /* ── Image message ──────────────────────────────────────────── */
  if (message.type === 'image' && message.file_url) {
    return (
      <div
        className={cn(
          'flex items-end gap-2 message-enter',
          isOwn ? 'flex-row-reverse' : 'flex-row',
          marginTop
        )}
      >
        <AvatarSlot isOwn={isOwn} position={position} message={message} />

        <div className={cn('max-w-[75%] sm:max-w-[65%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          <SenderName isOwn={isOwn} isGroup={isGroup} position={position} message={message} />

          <div
            className={cn(
              'relative group cursor-pointer overflow-hidden shadow-sm border transition-all duration-200 hover:shadow-md',
              isOwn
                ? `border-indigo-500/20 ${cornerOwn}`
                : `border-slate-200/80 ${cornerOther}`
            )}
            onClick={() => window.open(`${message.file_url}`, '_blank')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${message.file_url}`}
              alt="image"
              className="max-w-[280px] sm:max-w-[340px] max-h-[380px] w-auto h-auto object-cover group-hover:scale-[1.015] transition-transform duration-200"
            />
            {/* Floating frosted timestamp overlay */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white/95 text-[10px] font-medium select-none shadow-xs">
              {timeStr}
            </div>
          </div>

          {/* {message.content && (
            <div
              className={cn(
                'mt-1 px-3.5 py-2 text-[14px] leading-relaxed relative break-words',
                isOwn
                  ? `bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20 ${cornerOwn}`
                  : `bg-white text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 ${cornerOther}`
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )} */}
        </div>
      </div>
    );
  }

  /* ── File message ───────────────────────────────────────────── */
  if (message.type === 'file' && message.file_url) {
    const fileName = message.content || 'Tệp đính kèm';
    const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <div
        className={cn(
          'flex items-end gap-2 message-enter',
          isOwn ? 'flex-row-reverse' : 'flex-row',
          marginTop
        )}
      >
        <AvatarSlot isOwn={isOwn} position={position} message={message} />

        <div className={cn('max-w-[80%] sm:max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          <SenderName isOwn={isOwn} isGroup={isGroup} position={position} message={message} />

          <a
            href={`${apiBase}${message.file_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 p-3 transition-all duration-200 group relative',
              isOwn
                ? `bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25 ${cornerOwn}`
                : `bg-white text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100/90 hover:border-slate-200 ${cornerOther}`
            )}
          >
            {/* File Icon with ext badge */}
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                isOwn ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'
              )}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-tight uppercase leading-none mt-0.5">
                {ext.slice(0, 4)}
              </span>
            </div>

            {/* File Details */}
            <div className="flex flex-col min-w-0 pr-8">
              <span className="text-[13.5px] font-semibold truncate max-w-[200px] leading-tight">
                {fileName}
              </span>
              <span
                className={cn(
                  'text-[11px] mt-1 flex items-center gap-1',
                  isOwn ? 'text-indigo-200' : 'text-slate-400'
                )}
              >
                Nhấn để tải về
              </span>
            </div>

            {/* Download Icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isOwn
                  ? 'bg-white/10 group-hover:bg-white/20 text-white'
                  : 'bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-500'
              )}
            >
              <Download className="w-4 h-4" />
            </div>

            {/* Compact timestamp inside file card */}
            <span
              className={cn(
                'absolute bottom-1 right-2 text-[9px] font-medium select-none',
                isOwn ? 'text-white/60' : 'text-slate-400'
              )}
            >
              {timeStr}
            </span>
          </a>
        </div>
      </div>
    );
  }

  /* ── Audio message ──────────────────────────────────────────── */
  if (message.type === 'audio' && message.file_url) {
    return (
      <div
        className={cn(
          'flex items-end gap-2 message-enter',
          isOwn ? 'flex-row-reverse' : 'flex-row',
          marginTop
        )}
      >
        <AvatarSlot isOwn={isOwn} position={position} message={message} />

        <div className={cn('max-w-[80%] sm:max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          <SenderName isOwn={isOwn} isGroup={isGroup} position={position} message={message} />

          <div
            className={cn(
              'p-2.5 relative shadow-sm',
              isOwn
                ? `bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-indigo-500/20 ${cornerOwn}`
                : `bg-white text-slate-800 border border-slate-100 ${cornerOther}`
            )}
          >
            <audio controls className="max-w-xs h-9">
              <source src={`${apiBase}${message.file_url}`} />
            </audio>
            <div className={cn('flex justify-end mt-1 px-1', isOwn ? 'text-white/70' : 'text-slate-400')}>
              <span className="text-[10px] font-medium">{timeStr}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Text message (default) ─────────────────────────────────── */
  return (
    <div
      className={cn(
        'flex items-end gap-2 message-enter group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        marginTop
      )}
    >
      <AvatarSlot isOwn={isOwn} position={position} message={message} />

      <div
        className={cn(
          'max-w-[78%] sm:max-w-[70%] md:max-w-[65%] flex flex-col',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        <SenderName isOwn={isOwn} isGroup={isGroup} position={position} message={message} />

        <div
          className={cn(
            'relative px-3.5 py-2 text-[14px] leading-relaxed break-words transition-shadow duration-150',
            isOwn
              ? `bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_6px_rgba(99,102,241,0.22)] ${cornerOwn}`
              : `bg-white text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100/90 ${cornerOther}`
          )}
        >
          <p className="whitespace-pre-wrap break-words inline">
            {message.content}
            {/* Reserve width so text never collides with absolute timestamp */}
            <span className="inline-block w-10 h-2 select-none pointer-events-none" aria-hidden="true" />
          </p>

          <span
            title={new Date(message.created_at).toLocaleString('vi-VN')}
            className={cn(
              'absolute bottom-1.5 right-2.5 text-[10px] font-medium leading-none select-none tracking-tight whitespace-nowrap',
              isOwn ? 'text-white/75' : 'text-slate-400'
            )}
          >
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ──────────────────────────────────────── */

function AvatarSlot({
  isOwn,
  position,
  message,
}: {
  isOwn: boolean;
  position: BubblePosition;
  message: Message;
}) {
  if (isOwn) return null;
  // Avatar only displayed at the bottom of the group (single or last message)
  const isBottom = position === 'single' || position === 'last';
  return (
    <div className="w-7 flex-shrink-0 self-end mb-0.5">
      {isBottom ? (
        <Avatar
          name={message.sender?.name || 'User'}
          avatarUrl={message.sender?.avatar_url}
          size="sm"
        />
      ) : (
        <div className="w-7" />
      )}
    </div>
  );
}

function SenderName({
  isOwn,
  isGroup,
  position,
  message,
}: {
  isOwn: boolean;
  isGroup: boolean;
  position: BubblePosition;
  message: Message;
}) {
  // Only show sender name in group chats at the top of a run
  if (isOwn || !isGroup || (position !== 'first' && position !== 'single')) return null;
  return (
    <span className="text-[11px] font-semibold text-indigo-600 mb-1 ml-1.5 select-none">
      {message.sender?.name || 'Người dùng'}
    </span>
  );
}
