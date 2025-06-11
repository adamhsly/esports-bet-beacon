
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Trophy, Users } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns';

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
  detailedMatchCounts = {}
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

  const getDetailedMatchCount = (date: Date): MatchCountBreakdown => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return detailedMatchCounts[dateKey] || {
      total: 0,
      professional: 0,
      amateur: 0,
      live: 0,
      upcoming: 0
    };
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
          const detailedCount = getDetailedMatchCount(date);
          const isCurrentDay = isToday(date);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={`
                flex flex-col items-center justify-center min-w-[90px] h-24 rounded-lg border-2 transition-all relative group
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
              
              {/* Match count badges */}
              {matchCount > 0 && (
                <div className="flex gap-1 mt-1">
                  {detailedCount.professional > 0 && (
                    <Badge 
                      variant="outline" 
                      className={`
                        text-xs px-1 py-0.5 min-w-0 h-4 flex items-center
                        ${isSelected 
                          ? 'bg-blue-500/30 text-blue-300 border-blue-400/50' 
                          : 'bg-blue-500/20 text-blue-400 border-blue-400/30'
                        }
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
                        text-xs px-1 py-0.5 min-w-0 h-4 flex items-center
                        ${isSelected 
                          ? 'bg-orange-500/30 text-orange-300 border-orange-400/50' 
                          : 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                        }
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
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
