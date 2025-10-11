import React from 'react';
import { Trophy, Users, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceFilterProps {
  selectedSource: string;
  onSourceChange: (value: string) => void;
}

const sourceOptions = [
  { value: 'all', label: 'All Sources', icon: Gamepad2 },
  { value: 'professional', label: 'Professional', icon: Trophy },
  { value: 'amateur', label: 'Amateur', icon: Users },
];

export const SourceFilter: React.FC<SourceFilterProps> = ({
  selectedSource,
  onSourceChange,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {sourceOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedSource === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onSourceChange(option.value)}
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
