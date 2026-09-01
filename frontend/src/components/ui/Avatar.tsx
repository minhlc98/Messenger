import { cn, getAvatarUrl, getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const indicatorClasses = {
  sm: 'w-2.5 h-2.5 border-2',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

export default function Avatar({ name, avatarUrl, size = 'md', isOnline, className }: AvatarProps) {
  const initials = getInitials(name);
  const resolvedUrl = avatarUrl ? getAvatarUrl(avatarUrl) : '';

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold bg-indigo-600 text-white overflow-hidden',
          sizeClasses[size]
        )}
      >
        {resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            indicatorClasses[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
}
