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
      const selectedDateStart = startOfDay(date);
      setStartDate(addDays(selectedDateStart, -3)); // Center calendar on new picked date
      onDateSelect(selectedDateStart);
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
        <h3 className="text-base font-semibold text-white pl-2 md:pl-4">Select Date</h3>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-theme-gray-dark hover:bg-theme-purple text-white border-theme-gray-medium hover:border-theme-purple h-8 w-8 transition-all duration-200 rounded-xl"
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
        className="flex gap-1 overflow-x-auto scrollbar-hide w-full py-1 px-0.5"
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
                flex flex-col items-center justify-center min-w-[78px] max-w-[90px] w-[82px] h-14 
                lg:min-w-[90px] lg:max-w-[104px] lg:w-[94px] lg:h-16
                rounded-xl relative group
                p-0 mx-0
                bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28]
                shadow-[0_4px_15px_rgba(0,0,0,0.4)]
                before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none
                transition-all duration-[250ms] ease-in-out
                ${isSelected
                  ? 'border-2 border-[#965AFF] shadow-[0_0_15px_rgba(150,90,255,0.3),0_4px_15px_rgba(0,0,0,0.4)] translate-y-[-2px]'
                  : 'border-2 border-transparent hover:shadow-[0_0_10px_rgba(232,234,245,0.15),0_4px_15px_rgba(0,0,0,0.4)]'
                }
                ${isCurrentDay ? 'ring-2 ring-blue-400/50' : ''}
              `}
              style={{ 
                minWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 90 : 78, 
                maxWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 104 : 90, 
                width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 94 : 82, 
                height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 64 : 56 
              }}
            >
              <span className="text-xs lg:text-sm text-[#A8AEBF] uppercase leading-none mb-1">
                {format(date, 'EEE')}
              </span>
              <span className={`
                text-[13px] lg:text-[15px] font-semibold leading-none
                ${isSelected ? 'text-[#965AFF]' : 'text-[#E8EAF5]'}
              `}>
                {format(date, 'MMM d')}
              </span>

              {/* Match count badges */}
              {matchCount > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {detailedCount.professional > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] lg:text-[11px] px-1 py-0.5 min-w-0 h-4 lg:h-[18px] flex items-center bg-[#0A1823] text-[#49A8FF] border-transparent font-medium"
                    >
                      <Trophy size={8} className="mr-0.5 lg:w-[9px] lg:h-[9px]" />
                      {detailedCount.professional}
                    </Badge>
                  )}
                  {detailedCount.amateur > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] lg:text-[11px] px-1 py-0.5 min-w-0 h-4 lg:h-[18px] flex items-center bg-[#23180A] text-[#FF9A3E] border-transparent font-medium"
                    >
                      <Users size={8} className="mr-0.5 lg:w-[9px] lg:h-[9px]" />
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
