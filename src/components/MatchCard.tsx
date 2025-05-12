
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { getTeamImageUrl } from '@/utils/cacheUtils';

export interface TeamInfo {
  name: string;
  logo: string;
  id?: string;
  hash_image?: string;
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

  // Get proper team logo URLs, using cache if available
  const getTeamLogo = (team: TeamInfo): string => {
    console.log('MatchCard - Processing team image:', team);
    
    if (team.id && team.hash_image) {
      const imageUrl = getTeamImageUrl(team.id, team.hash_image);
      console.log(`MatchCard - Generated URL for team ${team.name}:`, imageUrl);
      return imageUrl;
    }
    
    if (team.logo && team.logo !== '/placeholder.svg') {
      console.log(`MatchCard - Using provided logo for team ${team.name}:`, team.logo);
      return team.logo;
    }
    
    console.log(`MatchCard - Using placeholder for team ${team.name}`);
    return '/placeholder.svg';
  };

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
          <img 
            src={getTeamLogo(teams[0])} 
            alt={teams[0].name} 
            className="w-10 h-10 object-contain" 
            onError={(e) => {
              console.log(`MatchCard - Image load error for team ${teams[0].name}`);
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <span className="font-medium text-white">{teams[0].name}</span>
        </div>
        <span className="text-gray-400">vs</span>
        <div className="flex items-center space-x-3">
          <span className="font-medium text-white">{teams[1].name}</span>
          <img 
            src={getTeamLogo(teams[1])} 
            alt={teams[1].name} 
            className="w-10 h-10 object-contain"
            onError={(e) => {
              console.log(`MatchCard - Image load error for team ${teams[1].name}`);
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
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
