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
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200",
              "bg-theme-gray-dark hover:bg-theme-purple text-white border-theme-gray-medium hover:border-theme-purple",
              "min-w-[100px] justify-between text-xs",
              openPill === id && "border-theme-purple bg-theme-purple/20"
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
            <div className="absolute top-full left-0 mt-2 w-full min-w-max bg-theme-gray-dark border border-theme-gray-medium rounded-xl shadow-lg z-50 overflow-hidden">
              {getOptions(id).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(id, option.value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs transition-colors text-white",
                    "hover:bg-theme-purple hover:text-white",
                    "flex items-center gap-2",
                    (
                      (id === 'game' && gameType === option.value) ||
                      (id === 'status' && statusFilter === option.value) ||
                      (id === 'source' && sourceFilter === option.value)
                    ) && "bg-theme-purple text-white font-medium"
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