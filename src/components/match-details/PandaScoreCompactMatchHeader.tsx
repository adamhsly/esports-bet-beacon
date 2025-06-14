
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, MapPin, Bell, BellRing, Calendar, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';

interface PandaScoreCompactMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
  };
  isMobile?: boolean;
}

export const PandaScoreCompactMatchHeader: React.FC<PandaScoreCompactMatchHeaderProps> = ({ 
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
        className={`text-xs ${isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
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
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-gray-400 text-sm flex-wrap mb-1">
              <div className="flex items-center">
                <Trophy className="h-3 w-3 mr-1" />
                <span className="truncate">{match.tournament || 'Pro Match'}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="uppercase">{match.esportType}</span>
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

        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-3'} gap-${isMobile ? '2' : '4'} items-center`}>
          <div className="text-center">
            <img 
              src={team1.logo || '/placeholder.svg'} 
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
          
          <div className="text-center">
            <div className={`bg-theme-gray-medium/50 rounded-lg p-${isMobile ? '2' : '3'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>VS</div>
              {!isMobile && (
                <div className="text-xs text-gray-400 mt-1">Bo{match.bestOf || 3}</div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <img 
              src={team2.logo || '/placeholder.svg'} 
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

        {!isMobile && (
          <div className="mt-3 flex items-center justify-center">
            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-400/30">
              Professional Match
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
