
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, MapPin, Bell, BellRing, Calendar, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';

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

  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

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

  const isMatchInPast = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    return startTime.getTime() < now.getTime();
  };

  const NotifyButton = () => {
    const isPastMatch = isMatchInPast();
    
    if (isChecking) {
      return (
        <Button size="sm" variant="outline" disabled className="text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
        </Button>
      );
    }

    return (
      <Button 
        size="sm" 
        variant={isSubscribed ? "default" : "outline"} 
        className={`text-xs ${isSubscribed ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
        onClick={toggleNotification}
        disabled={isLoading || isPastMatch}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellRing className="h-3 w-3 mr-1" />
            {isMobile ? '' : 'Subscribed'}
          </>
        ) : (
          <>
            <Bell className="h-3 w-3 mr-1" />
            {isMobile ? '' : 'Notify'}
          </>
        )}
      </Button>
    );
  };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden">
      <div className={`p-${isMobile ? '2' : '4'}`}>
        {/* Tournament Info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-gray-400 text-sm flex-wrap mb-1">
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
              <NotifyButton />
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                {getTimeUntilMatch()}
              </Badge>
            </div>
          )}
        </div>

        {/* Teams Layout */}
        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-3'} gap-${isMobile ? '2' : '4'} items-center`}>
          {/* Team 1 */}
          <div className="text-center">
            <img 
              src={team1.logo || team1.avatar || '/placeholder.svg'} 
              alt={team1.name} 
              className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} object-contain mx-auto mb-${isMobile ? '1' : '2'} rounded`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-white truncate`}>
              {team1.name}
            </h3>
          </div>
          
          {/* VS Section */}
          <div className="text-center">
            <div className={`bg-theme-gray-medium/50 rounded-lg p-${isMobile ? '2' : '3'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>VS</div>
              {!isMobile && (
                <div className="text-xs text-gray-400 mt-1">Bo1</div>
              )}
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="text-center">
            <img 
              src={team2.logo || team2.avatar || '/placeholder.svg'} 
              alt={team2.name} 
              className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} object-contain mx-auto mb-${isMobile ? '1' : '2'} rounded`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-white truncate`}>
              {team2.name}
            </h3>
          </div>
        </div>

        {/* Mobile Bottom Section */}
        {isMobile && (
          <div className="mt-3 pt-2 border-t border-theme-gray-medium">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
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
              <NotifyButton />
            </div>
          </div>
        )}

        {/* Desktop Additional Info */}
        {!isMobile && (
          <div className="mt-3 flex items-center justify-center">
            {match.faceitData?.calculateElo && (
              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-400/30">
                ELO Match
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
