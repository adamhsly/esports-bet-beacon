
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns';

interface DateMatchPickerProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  matchCounts?: Record<string, number>;
}

export const DateMatchPicker: React.FC<DateMatchPickerProps> = ({
  onDateSelect,
  selectedDate,
  matchCounts = {}
}) => {
  const [startDate, setStartDate] = useState(() => addDays(new Date(), -3));
  
  // Generate 14 days starting from startDate
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

  const scrollLeft = () => {
    setStartDate(prev => addDays(prev, -7));
  };

  const scrollRight = () => {
    setStartDate(prev => addDays(prev, 7));
  };

  const getMatchCount = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return matchCounts[dateKey] || 0;
  };

  return (
    <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Select Date</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollLeft}
            className="text-gray-400 border-gray-600 hover:bg-gray-700"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={scrollRight}
            className="text-gray-400 border-gray-600 hover:bg-gray-700"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const matchCount = getMatchCount(date);
          const isCurrentDay = isToday(date);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={`
                flex flex-col items-center justify-center min-w-[80px] h-20 rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'border-theme-purple bg-theme-purple/20 text-theme-purple' 
                  : 'border-theme-gray-medium bg-theme-gray hover:border-theme-purple/50'
                }
                ${isCurrentDay ? 'ring-2 ring-blue-400/50' : ''}
              `}
            >
              <span className="text-xs text-gray-400 uppercase">
                {format(date, 'EEE')}
              </span>
              <span className={`text-lg font-semibold ${isSelected ? 'text-theme-purple' : 'text-white'}`}>
                {format(date, 'd')}
              </span>
              {matchCount > 0 && (
                <Badge 
                  variant="outline" 
                  className={`
                    text-xs mt-1 px-1.5 py-0.5 min-w-0
                    ${isSelected 
                      ? 'bg-theme-purple/30 text-theme-purple border-theme-purple/50' 
                      : 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                    }
                  `}
                >
                  {matchCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
