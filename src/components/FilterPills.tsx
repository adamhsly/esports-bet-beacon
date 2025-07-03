import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Gamepad2, Clock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterPillProps {
  gameType: string;
  statusFilter: string;
  sourceFilter: string;
  onGameTypeChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
}

const GAME_TYPE_OPTIONS = [
  { label: 'All Games', value: 'all' },
  { label: 'CS:GO / CS2', value: 'cs2' },
  { label: 'League of Legends', value: 'lol' },
  { label: 'Dota 2', value: 'dota2' },
  { label: 'Valorant', value: 'valorant' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Matches', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Finished', value: 'finished' },
];

const SOURCE_FILTER_OPTIONS = [
  { label: 'All Sources', value: 'all' },
  { label: 'Professional', value: 'professional' },
  { label: 'Amateur', value: 'amateur' },
];

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
        return <Gamepad2 className="h-4 w-4" />;
      case 'status':
        return <Clock className="h-4 w-4" />;
      case 'source':
        return <Trophy className="h-4 w-4" />;
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
    { id: 'game', label: 'Game Type' },
    { id: 'status', label: 'Match Status' },
    { id: 'source', label: 'Competition Level' },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {pillConfigs.map(({ id, label }) => (
        <div
          key={id}
          ref={(el) => (pillRefs.current[id] = el)}
          className="relative"
        >
          <button
            onClick={() => handlePillClick(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200",
              "bg-card hover:bg-accent text-card-foreground",
              "border-border hover:border-primary/30",
              "min-w-[140px] justify-between",
              openPill === id && "border-primary bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              {getPillIcon(id)}
              <span className="text-sm font-medium truncate">
                {getSelectedLabel(id)}
              </span>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200 flex-shrink-0",
                openPill === id && "rotate-180"
              )} 
            />
          </button>

          {openPill === id && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-max bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {getOptions(id).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(id, option.value)}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "flex items-center gap-2",
                    (
                      (id === 'game' && gameType === option.value) ||
                      (id === 'status' && statusFilter === option.value) ||
                      (id === 'source' && sourceFilter === option.value)
                    ) && "bg-accent text-accent-foreground font-medium"
                  )}
                >
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