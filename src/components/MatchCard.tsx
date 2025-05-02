
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';

export interface TeamInfo {
  name: string;
  logo: string;
}

export interface MatchInfo {
  id: string;
  teams: [TeamInfo, TeamInfo];
  startTime: string;
  tournament: string;
  esportType: string;
  bestOf: number;
}

interface MatchCardProps {
  match: MatchInfo;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { id, teams, startTime, tournament, bestOf } = match;
  const matchDate = new Date(startTime);
  
  const formattedDate = matchDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const formattedTime = matchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="match-card bg-theme-gray-dark/80 border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-400 font-medium">{tournament}</span>
        <span className="text-xs text-theme-green bg-theme-green/10 px-2 py-0.5 rounded-full">
          BO{bestOf}
        </span>
      </div>
      
      <div className="flex justify-between items-center my-4">
        <div className="flex items-center space-x-3">
          <img src={teams[0].logo || '/placeholder.svg'} alt={teams[0].name} className="w-10 h-10 object-contain" />
          <span className="font-medium text-white">{teams[0].name}</span>
        </div>
        <span className="text-gray-400">vs</span>
        <div className="flex items-center space-x-3">
          <span className="font-medium text-white">{teams[1].name}</span>
          <img src={teams[1].logo || '/placeholder.svg'} alt={teams[1].name} className="w-10 h-10 object-contain" />
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center text-gray-400 text-sm">
          <Clock size={14} className="mr-1.5" />
          <span>{formattedDate} · {formattedTime}</span>
        </div>
        
        <Button variant="ghost" size="sm" asChild className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
          <Link to={`/match/${id}`}>
            Compare Odds
            <ArrowRight size={14} className="ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
