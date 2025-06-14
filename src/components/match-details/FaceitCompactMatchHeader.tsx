
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, MapPin, Bell, BellOff, Calendar } from 'lucide-react';

interface FaceitCompactMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      avatar?: string;
      roster?: Array<{
        nickname: string;
        player_id: string;
        skill_level?: number;
      }>;
    }>;
    startTime: string;
    competition_name?: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      calculateElo?: boolean;
    };
    status: string;
  };
  isMobile?: boolean;
}

export const FaceitCompactMatchHeader: React.FC<FaceitCompactMatchHeaderProps> = ({ 
  match, 
  isMobile = false 
}) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  const getTimeUntilMatch = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m` : 'Starting soon';
    }
    return diffHours < 24 ? `${diffHours}h` : `${Math.ceil(diffHours / 24)}d`;
  };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden">
      <div className={`p-${isMobile ? '3' : '6'}`}>
        {/* Match Title and Quick Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-1`}>
              {team1.name} vs {team2.name}
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm flex-wrap">
              <div className="flex items-center">
                <Trophy className="h-3 w-3 mr-1" />
                <span className="truncate">{match.competition_name || 'FACEIT Match'}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{match.faceitData?.region || 'EU'}</span>
              </div>
            </div>
          </div>
          
          {!isMobile && (
            <div className="flex items-center space-x-2 ml-4">
              <Button size="sm" variant="outline" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Notify
              </Button>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                {getTimeUntilMatch()}
              </Badge>
            </div>
          )}
        </div>

        {/* Teams and Match Info */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-6'} items-center`}>
          {/* Team 1 */}
          <div className={`${isMobile ? 'flex items-center space-x-3' : 'text-center'}`}>
            <img 
              src={team1.logo || team1.avatar || '/placeholder.svg'} 
              alt={team1.name} 
              className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} object-contain ${isMobile ? '' : 'mx-auto mb-2'} rounded`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div className={isMobile ? 'flex-1' : ''}>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-white`}>
                {team1.name}
              </h3>
              <p className="text-xs text-gray-400">
                {team1.roster?.length || 0} players
              </p>
            </div>
          </div>
          
          {/* Match Details */}
          {!isMobile && (
            <div className="text-center">
              <div className="bg-theme-gray-medium/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white mb-1">VS</div>
                <div className="text-xs text-gray-400">Best of 1</div>
                <Badge variant="outline" className="mt-2 text-xs">
                  {match.faceitData?.calculateElo ? 'ELO Match' : 'League'}
                </Badge>
              </div>
            </div>
          )}
          
          {/* Team 2 */}
          <div className={`${isMobile ? 'flex items-center space-x-3' : 'text-center'}`}>
            <img 
              src={team2.logo || team2.avatar || '/placeholder.svg'} 
              alt={team2.name} 
              className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} object-contain ${isMobile ? '' : 'mx-auto mb-2'} rounded`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div className={isMobile ? 'flex-1' : ''}>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-white`}>
                {team2.name}
              </h3>
              <p className="text-xs text-gray-400">
                {team2.roster?.length || 0} players
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-specific bottom section */}
        {isMobile && (
          <div className="mt-4 pt-3 border-t border-theme-gray-medium">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                  <span className="text-white text-xs">
                    {new Date(match.startTime).toLocaleDateString([], { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs">
                  {getTimeUntilMatch()}
                </Badge>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Bell className="h-3 w-3 mr-1" />
                Notify
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
