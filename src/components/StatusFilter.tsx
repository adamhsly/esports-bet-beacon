import React from 'react';
import { Clock, Zap, Check, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusFilterProps {
  selectedStatus: string;
  onStatusChange: (value: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Matches', icon: PlayCircle },
  { value: 'live', label: 'Live', icon: Zap },
  { value: 'upcoming', label: 'Upcoming', icon: Clock },
  { value: 'finished', label: 'Finished', icon: Check },
];

export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatus,
  onStatusChange,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {statusOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedStatus === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 whitespace-nowrap",
              isSelected
                ? "bg-theme-purple border-theme-purple text-white shadow-lg"
                : "bg-theme-gray-dark border-theme-gray-medium text-white hover:border-theme-purple hover:bg-theme-purple/20"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
