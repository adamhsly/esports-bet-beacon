
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Trophy, Users } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface MatchCountBreakdown {
  total: number;
  professional: number;
  amateur: number;
  live: number;
  upcoming: number;
}

interface DateMatchPickerProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  matchCounts?: Record<string, number>;
  detailedMatchCounts?: Record<string, MatchCountBreakdown>;
}

export const DateMatchPicker: React.FC<DateMatchPickerProps> = ({
  onDateSelect,
  selectedDate,
  matchCounts = {},
  detailedMatchCounts = {},
}) => {
  const [startDate, setStartDate] = useState(() => addDays(new Date(), -3));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate 14 days starting from startDate
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

  // When selectedDate changes, center it in the scrollable carousel
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const idx = dates.findIndex(date => isSameDay(date, selectedDate));
    if (idx === -1) return;

    const selectedButton = scrollContainerRef.current.querySelectorAll<HTMLButtonElement>('button[data-role="date-btn"]')[idx];
    if (selectedButton && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      const containerRect = scrollContainer.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();

      // Calculate center
      const scrollTo =
        selectedButton.offsetLeft -
        scrollContainer.offsetLeft -
        containerRect.width / 2 +
        buttonRect.width / 2;

      scrollContainer.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, [selectedDate, startDate]);

  // Helper to handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(addDays(startOfDay(date), -3)); // Center calendar on new picked date
      onDateSelect(startOfDay(date));
      setCalendarOpen(false);
    }
  };

  const getMatchCount = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return matchCounts[dateKey] || 0;
  };

  const getDetailedMatchCount = (date: Date): MatchCountBreakdown => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return detailedMatchCounts[dateKey] || {
      total: 0,
      professional: 0,
      amateur: 0,
      live: 0,
      upcoming: 0,
    };
  };

  return (
    <div className="w-full mb-6">
      {/* Controls row */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-white">Select Date</h3>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="text-gray-400 border-gray-600 hover:bg-gray-700 h-8 w-8 p-0"
              aria-label="Open calendar"
            >
              <CalendarIcon size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide w-full pb-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const matchCount = getMatchCount(date);
          const detailedCount = getDetailedMatchCount(date);
          const isCurrentDay = isToday(date);

          return (
            <button
              key={date.toISOString()}
              data-role="date-btn"
              onClick={() => onDateSelect(date)}
              className={`
                flex flex-col items-center justify-center min-w-[78px] max-w-[90px] w-[82px] h-14 rounded-md border-2 transition-all relative group
                ${isSelected
                  ? 'border-theme-purple bg-theme-purple/20 text-theme-purple'
                  : 'border-theme-gray-medium bg-theme-gray hover:border-theme-purple/50 text-white'
                }
                ${isCurrentDay ? 'ring-2 ring-blue-400/50' : ''}
                p-0 mx-0
              `}
              style={{ minWidth: 78, maxWidth: 90, width: 82, height: 56 }}
            >
              <span className="text-xs text-gray-400 uppercase leading-none mb-1">
                {format(date, 'EEE')}
              </span>
              <span className={`
                text-[13px] font-semibold leading-none
                ${isSelected ? 'text-theme-purple' : 'text-white'}
              `}>
                {format(date, 'MMM d')}
              </span>

              {/* Match count badges */}
              {matchCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {detailedCount.professional > 0 && (
                    <Badge
                      variant="outline"
                      className={`
                        text-[10px] px-1 py-0.5 min-w-0 h-4 flex items-center
                        ${isSelected
                        ? 'bg-blue-500/30 text-blue-300 border-blue-400/50'
                        : 'bg-blue-500/20 text-blue-400 border-blue-400/30'
                      }
                        font-medium
                      `}
                    >
                      <Trophy size={8} className="mr-0.5" />
                      {detailedCount.professional}
                    </Badge>
                  )}
                  {detailedCount.amateur > 0 && (
                    <Badge
                      variant="outline"
                      className={`
                        text-[10px] px-1 py-0.5 min-w-0 h-4 flex items-center
                        ${isSelected
                        ? 'bg-orange-500/30 text-orange-300 border-orange-400/50'
                        : 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                      }
                        font-medium
                      `}
                    >
                      <Users size={8} className="mr-0.5" />
                      {detailedCount.amateur}
                    </Badge>
                  )}
                </div>
              )}

              {/* Tooltip */}
              {matchCount > 0 && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <div>Total: {detailedCount.total}</div>
                  {detailedCount.professional > 0 && <div>Pro: {detailedCount.professional}</div>}
                  {detailedCount.amateur > 0 && <div>Amateur: {detailedCount.amateur}</div>}
                  {detailedCount.live > 0 && <div>Live: {detailedCount.live}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
