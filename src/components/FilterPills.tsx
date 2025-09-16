import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock, Trophy, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GAME_TYPE_OPTIONS, STATUS_FILTER_OPTIONS, SOURCE_FILTER_OPTIONS, GameTypeOption } from '@/lib/gameTypes';

export interface FilterPillProps {
  gameType: string;
  statusFilter: string;
  sourceFilter: string;
  onGameTypeChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
}

export const FilterPills: React.FC<FilterPillProps> = ({
  gameType,
  statusFilter,
  sourceFilter,
  onGameTypeChange,
  onStatusFilterChange,
  onSourceFilterChange,
}) => {
  const [openPill, setOpenPill] = useState<string | null>(null);
  const pillRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openPill && pillRefs.current[openPill] && !pillRefs.current[openPill]?.contains(event.target as Node)) {
        setOpenPill(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPill]);

  const handlePillClick = (pillId: string) => {
    setOpenPill(openPill === pillId ? null : pillId);
  };

  const handleOptionSelect = (pillId: string, value: string) => {
    switch (pillId) {
      case 'game':
        onGameTypeChange(value);
        break;
      case 'status':
        onStatusFilterChange(value);
        break;
      case 'source':
        onSourceFilterChange(value);
        break;
    }
    setOpenPill(null);
  };

  const getSelectedLabel = (pillId: string) => {
    switch (pillId) {
      case 'game':
        return GAME_TYPE_OPTIONS.find(opt => opt.value === gameType)?.label || 'All Games';
      case 'status':
        return STATUS_FILTER_OPTIONS.find(opt => opt.value === statusFilter)?.label || 'All Matches';
      case 'source':
        return SOURCE_FILTER_OPTIONS.find(opt => opt.value === sourceFilter)?.label || 'All Sources';
      default:
        return '';
    }
  };

  const getPillIcon = (pillId: string) => {
    switch (pillId) {
      case 'game':
        return <Gamepad2 className="h-3 w-3" />;
      case 'status':
        return <Clock className="h-3 w-3" />;
      case 'source':
        return <Trophy className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getOptions = (pillId: string) => {
    switch (pillId) {
      case 'game':
        return GAME_TYPE_OPTIONS;
      case 'status':
        return STATUS_FILTER_OPTIONS;
      case 'source':
        return SOURCE_FILTER_OPTIONS;
      default:
        return [];
    }
  };

  const pillConfigs = [
    { id: 'status', label: 'Match Status' },
    { id: 'source', label: 'Competition Level' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pillConfigs.map(({ id, label }) => (
        <div
          key={id}
          ref={(el) => (pillRefs.current[id] = el)}
          className="relative"
        >
          <button
            onClick={() => handlePillClick(id)}
            className={cn(
              "glass-button glass-button-secondary flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300",
              "min-w-[100px] justify-between text-xs hover:scale-102 neon-glow",
              openPill === id && "border-glass-neon-purple bg-glass-purple/20"
            )}
          >
            <div className="flex items-center gap-1.5">
              {getPillIcon(id)}
              <span className="text-xs font-medium truncate">
                {getSelectedLabel(id)}
              </span>
            </div>
            <ChevronDown 
              className={cn(
                "h-3 w-3 transition-transform duration-200 flex-shrink-0",
                openPill === id && "rotate-180"
              )} 
            />
          </button>

          {openPill === id && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-max glass-card border border-glass-border rounded-xl shadow-lg z-50 overflow-hidden neon-border">
              {getOptions(id).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(id, option.value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs transition-all glass-text-primary",
                    "hover:bg-glass-purple hover:text-glass-neon-purple hover:scale-102",
                    "flex items-center gap-2",
                    (
                      (id === 'game' && gameType === option.value) ||
                      (id === 'status' && statusFilter === option.value) ||
                      (id === 'source' && sourceFilter === option.value)
                    ) && "bg-glass-purple text-glass-neon-purple font-medium neon-glow"
                  )}
                >
                  {id === 'game' && 'icon' in option && (() => {
                    const Icon = (option as GameTypeOption).icon;
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};