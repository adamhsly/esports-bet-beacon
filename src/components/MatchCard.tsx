
import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Trophy, Users } from 'lucide-react';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { Badge } from '@/components/ui/badge';

export interface TeamInfo {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  id?: string;
  hash_image?: string | null;
}

export interface Player {
  name: string;
  position: string;
  hash_image: string;
  short_name: string;
  country_name: string;
  date_of_birth: string;
}

export interface MatchInfo {
  id: string;
  teams: [TeamInfo, TeamInfo];
  startTime: string;
  tournament: string;
  tournament_name?: string;
  season_name?: string;
  class_name?: string;
  league_name?: string;
  esportType: string;
  bestOf: number;
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
  source?: 'professional' | 'amateur';
  faceitData?: {
    region?: string;
    competitionType?: string;
    organizedBy?: string;
    calculateElo?: boolean;
  };
}

interface MatchCardProps {
  match: MatchInfo;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { teams, startTime, tournament, tournament_name, source, bestOf } = match;
  const matchDate = new Date(startTime);

  // Determine color based on match source
  let bgClass = 'bg-theme-gray-medium';
  let ringClass = '';
  let badgeProps: { color: string; text: string; icon: React.ReactNode; badgeClass: string; outlineClass: string } = {
    color: 'gray',
    text: '',
    icon: null,
    badgeClass: '',
    outlineClass: '',
  };

  if (source === 'professional') {
    bgClass = 'bg-blue-950/70';
    ringClass = 'ring-1 ring-blue-400/30';
    badgeProps = {
      color: 'blue',
      text: 'PRO',
      icon: <Trophy size={13} className="mr-1" />,
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
      outlineClass: 'variant-outline',
    };
  } else if (source === 'amateur') {
    bgClass = 'bg-orange-950/70';
    ringClass = 'ring-1 ring-orange-400/30';
    badgeProps = {
      color: 'orange',
      text: 'FACEIT',
      icon: <Users size={13} className="mr-1" />,
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-400/30',
      outlineClass: 'variant-outline',
    };
  }

  return (
    <Card className={`${bgClass} ${ringClass} border-0 rounded-xl shadow-none px-0 py-0 transition-colors duration-200`}>
      <div className="flex flex-col gap-1 px-3 py-2">
        {/* Tournament info and time row */}
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-xs text-gray-400 truncate max-w-[65%] font-medium">
            {tournament_name || tournament}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400 font-semibold min-w-[48px] justify-end">
            <Clock size={14} className="mr-1" />
            {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {/* Teams row */}
        <div className="flex items-center justify-between min-h-10 mt-0.5">
          {/* Team 1 */}
          <div className="flex items-center gap-2 flex-1">
            <img
              src={getEnhancedTeamLogoUrl(teams[0])}
              alt={`${teams[0].name} logo`}
              className="w-7 h-7 object-contain rounded-md bg-gray-800"
              onError={e => (e.currentTarget.src = '/placeholder.svg')}
            />
            <span className="truncate font-semibold text-sm text-white max-w-[90px]">{teams[0].name}</span>
          </div>
          <span className="text-md font-bold text-gray-400 mx-2">vs</span>
          {/* Team 2 */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="truncate font-semibold text-sm text-white max-w-[90px] text-right">{teams[1].name}</span>
            <img
              src={getEnhancedTeamLogoUrl(teams[1])}
              alt={`${teams[1].name} logo`}
              className="w-7 h-7 object-contain rounded-md bg-gray-800"
              onError={e => (e.currentTarget.src = '/placeholder.svg')}
            />
          </div>
        </div>
        {/* NEW: Label row for PRO/FACEIT and Best of amount */}
        <div className="flex items-center justify-between mt-2">
          <Badge
            variant="outline"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeProps.badgeClass}`}
          >
            {badgeProps.icon}
            {badgeProps.text}
          </Badge>
          <span className="text-xs text-gray-300 font-semibold ml-2">
            BO{bestOf}
          </span>
        </div>
      </div>
    </Card>
  );
};
