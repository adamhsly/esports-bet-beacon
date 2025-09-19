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
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-16 w-16',
  xl: 'h-20 w-20'
};

export const EnhancedAvatar: React.FC<EnhancedAvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback,
  frameUrl,
  borderUrl,
  className,
  size = 'md'
}) => {
  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Border (background layer) */}
      {borderUrl && (
        <img 
          src={borderUrl}
          alt="Avatar border"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 1 }}
        />
      )}
      
      {/* Avatar (middle layer) */}
      <Avatar className={cn('relative', sizeClasses[size])} style={{ zIndex: 2 }}>
        {src && <AvatarImage src={src} alt={alt} />}
        <AvatarFallback>
          {fallback}
        </AvatarFallback>
      </Avatar>
      
      {/* Frame (top layer) */}
      {frameUrl && (
        <img 
          src={frameUrl}
          alt="Avatar frame"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 3 }}
        />
      )}
    </div>
  );
};