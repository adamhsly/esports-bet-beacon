
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Match {
  id: string;
  tournament_name?: string;
  home_team_name?: string;
  away_team_name?: string;
  start_time: string;
  status?: string;
  result?: string;
  score?: string;
}

interface MatchTimelineSelectorProps {
  matches: Match[];
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
  isLoading?: boolean;
}

const MatchTimelineSelector: React.FC<MatchTimelineSelectorProps> = ({
  matches,
  selectedMatchId,
  onSelectMatch,
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const matchesPerPage = 3;
  const totalPages = Math.ceil(matches.length / matchesPerPage);
  
  const paginatedMatches = matches.slice(
    currentPage * matchesPerPage, 
    (currentPage + 1) * matchesPerPage
  );
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const getResultBadgeColor = (result?: string) => {
    if (!result) return "bg-gray-500";
    switch (result.toLowerCase()) {
      case 'win': return "bg-green-500";
      case 'loss': return "bg-red-500";
      case 'draw': return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center">
          <Calendar size={18} className="mr-2 text-theme-purple" />
          Recent Matches
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0 || isLoading}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm">
            {currentPage + 1} / {Math.max(1, totalPages)}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1 || isLoading}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-6 w-6 border-b-2 border-theme-purple rounded-full"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            No match history available
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedMatches.map((match) => {
              const isSelected = match.id === selectedMatchId;
              const matchDate = new Date(match.start_time);
              
              return (
                <div 
                  key={match.id}
                  className={`p-3 rounded-md cursor-pointer transition-all border ${
                    isSelected 
                      ? 'border-theme-purple bg-theme-purple/10' 
                      : 'border-theme-gray-medium bg-theme-gray-medium/30 hover:bg-theme-gray-medium/50'
                  }`}
                  onClick={() => onSelectMatch(match.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">
                      {matchDate.toLocaleDateString()} · {matchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <Badge className={getResultBadgeColor(match.result)}>
                      {match.result || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{match.home_team_name || 'Team 1'}</div>
                    <div className="text-sm font-bold">{match.score || 'vs'}</div>
                    <div className="text-sm font-medium">{match.away_team_name || 'Team 2'}</div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-400 truncate">
                    {match.tournament_name || 'Tournament'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchTimelineSelector;
