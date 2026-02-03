import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositionChangeIndicatorProps {
  change: number | null | undefined;
  size?: 'sm' | 'md';
  showNumber?: boolean;
  className?: string;
}

/**
 * Shows position movement with up/down arrows
 * Positive = moved up, Negative = moved down, 0 or null = no change
 */
export const PositionChangeIndicator: React.FC<PositionChangeIndicatorProps> = ({
  change,
  size = 'sm',
  showNumber = true,
  className
}) => {
  // No data or no change
  if (change === null || change === undefined || change === 0) {
    return null;
  }

  const isPositive = change > 0;
  const absChange = Math.abs(change);
  
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5',
        isPositive ? 'text-emerald-400' : 'text-destructive',
        className
      )}
    >
      {isPositive ? (
        <ChevronUp className={iconSize} />
      ) : (
        <ChevronDown className={iconSize} />
      )}
      {showNumber && absChange > 1 && (
        <span className={cn('font-medium leading-none', textSize)}>
          {absChange}
        </span>
      )}
    </div>
  );
};
