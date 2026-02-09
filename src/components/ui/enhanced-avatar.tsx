import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface EnhancedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string | React.ReactNode;
  frameUrl?: string | null;
  borderUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-16 w-16',
  xl: 'h-20 w-20'
};

const avatarSizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7', 
  lg: 'h-12 w-12',
  xl: 'h-14 w-14'
};

// Generate a deterministic avatar URL from a seed string using DiceBear
const generateAvatarUrl = (seed: string): string => {
  const encoded = encodeURIComponent(seed.toLowerCase().trim());
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encoded}&backgroundColor=1a1a2e`;
};

export const EnhancedAvatar: React.FC<EnhancedAvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback,
  frameUrl,
  borderUrl,
  className,
  fallbackClassName,
  size = 'md'
}) => {
  // If no src provided, auto-generate an avatar from the fallback text
  const avatarSrc = src || (typeof fallback === 'string' && fallback ? generateAvatarUrl(fallback) : null);

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Border (background layer) */}
      {borderUrl && (
        <img 
          src={borderUrl}
          alt="Avatar border"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 1 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      
      {/* Avatar (middle layer) - centered and smaller to show border around */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
        <Avatar className={cn('relative', avatarSizeClasses[size])}>
          {avatarSrc && <AvatarImage src={avatarSrc} alt={alt} onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }} />}
          <AvatarFallback className={fallbackClassName}>
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {/* Frame (top layer) */}
      {frameUrl && (
        <img 
          src={frameUrl}
          alt="Avatar frame"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 3 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
};