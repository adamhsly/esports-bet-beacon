import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trophy, MapPin, Bell, BellRing, Calendar, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from '@/components/CountdownTimer';

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const isMatchInPast = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    return startTime.getTime() < now.getTime();
  };

  const { date, time } = formatDateTime(match.startTime);

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

  // Use only match.startTime (as string) for timer
  const startTime = match.startTime;

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium">
      <div className="p-3">
        {/* Top Section - Tournament and Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-gray-300 text-sm flex-wrap mb-1">
              <span className="truncate">{match.tournament || 'Pro Match'}</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                <Trophy size={12} className="mr-1" />
                PRO
              </Badge>
            </div>
            <span className="text-xs text-blue-400 uppercase">{match.esportType}</span>
          </div>
          <Badge className="bg-theme-purple">
            BO{match.bestOf || 3}
          </Badge>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer targetTime={startTime} className="mb-2 mt-[-0.5rem]" />

        {/* Teams Section */}
        <div className={`flex items-center justify-between gap-${isMobile ? '2' : '4'} mb-4`}>
          {[team1, team2].map((team, index) => (
            <div key={team.name || index} className={`flex flex-1 items-center ${index === 1 ? 'flex-row-reverse' : ''}`}>
              <div className={`flex flex-col items-${index === 0 ? 'start' : 'end'} flex-1`}>
                <img
                  src={team.logo || '/placeholder.svg'}
                  alt={`${team.name} logo`}
                  className={`${isMobile ? 'w-10 h-10' : 'w-14 h-14'} object-contain mb-${isMobile ? '1' : '2'}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-white truncate`}>
                  {team.name}
                </span>
              </div>
              {index === 0 && (
                <span className={`mx-${isMobile ? '2' : '4'} ${isMobile ? 'text-lg' : 'text-xl'} text-gray-400 font-bold`}>vs</span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Section - Time and Notification */}
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400 text-xs gap-3 flex-wrap">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {isMobile 
                  ? new Date(match.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : `${date} • ${time}`
                }
              </span>
            </div>
            {!isMobile && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="uppercase">{match.esportType}</span>
              </div>
            )}
          </div>

          <NotifyButton />
        </div>
      </div>
    </Card>
  );
};
