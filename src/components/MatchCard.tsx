import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';

export interface TeamInfo {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  id?: string;
  hash_image?: string | null;
}

export interface MatchInfo {
  id: string;
  teams: [TeamInfo, TeamInfo];
  startTime: string;
  tournament: string;
  tournament_name?: string;
  season_name?: string;
  class_name?: string;
  esportType: string;
  bestOf: number;
}

interface MatchCardProps {
  match: MatchInfo;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { id, teams, startTime, tournament, tournament_name, season_name, class_name, bestOf } = match;
  const matchDate = new Date(startTime);

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">{tournament_name || tournament}</span>
            {season_name && (
              <span className="text-xs text-gray-500">{season_name}</span>
            )}
            {class_name && (
              <span className="text-xs text-gray-500">{class_name}</span>
            )}
          </div>
          <Badge className="bg-theme-purple">
            BO{bestOf}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          {teams.map((team, index) => (
            <div key={team.id || index} className={`flex flex-1 items-center ${index === 1 ? 'flex-row-reverse' : ''}`}>
              <div className={`flex flex-col items-${index === 0 ? 'start' : 'end'} flex-1`}>
                <img
                  src={getEnhancedTeamLogoUrl(team)}
                  alt={`${team.name} logo`}
                  className="w-16 h-16 object-contain mb-2"
                  onError={(e) => {
                    console.log(`MatchCard - Image load error for team ${team.name}`);
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <span className="font-medium text-white">{team.name}</span>
              </div>
              {index === 0 && (
                <span className="mx-4 text-gray-400">vs</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center text-gray-400 text-sm">
            <Clock size={14} className="mr-1.5" />
            <span>
              {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
              {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <Button variant="ghost" size="sm" asChild className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
            <Link to={`/match/${id}`}>
              View Match
              <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};