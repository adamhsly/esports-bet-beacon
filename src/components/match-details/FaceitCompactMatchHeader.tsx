
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trophy, MapPin, Bell, BellRing, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';

interface FaceitCompactMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo: string;
    }>;
    tournament: string;
    startTime: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      organizedBy?: string;
      calculateElo?: boolean;
    };
    bestOf?: number;
  };
  isMobile?: boolean;
}

export const FaceitCompactMatchHeader: React.FC<FaceitCompactMatchHeaderProps> = ({ match, isMobile = false }) => {
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

  return (
    <div className="space-y-3">
      {/* Tournament Badge */}
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30">
          <Users size={14} className="mr-1" />
          FACEIT Amateur
        </Badge>
      </div>

      {/* Notification Button */}
      <div className="flex justify-center">
        {isChecking ? (
          <Button disabled variant="outline" size="sm">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Loading...
          </Button>
        ) : (
          <Button 
            variant={isSubscribed ? "default" : "outline"}
            size="sm"
            className={isSubscribed ? 'bg-orange-500 hover:bg-orange-600' : ''}
            onClick={toggleNotification}
            disabled={isLoading || isMatchInPast()}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : isSubscribed ? (
              <>
                <BellRing className="h-3 w-3 mr-1" />
                Subscribed
              </>
            ) : (
              <>
                <Bell className="h-3 w-3 mr-1" />
                Get Notified
              </>
            )}
          </Button>
        )}
      </div>

      {/* Teams Display */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Team 1 */}
        <div className="text-center">
          <img 
            src={match.teams[0]?.logo || '/placeholder.svg'} 
            alt={match.teams[0]?.name} 
            className="w-12 h-12 object-contain mx-auto mb-1 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h3 className="text-sm font-bold text-white truncate">{match.teams[0]?.name}</h3>
        </div>
        
        {/* VS Section with Best Of Badge */}
        <div className="text-center">
          <div className="bg-theme-gray-medium/50 rounded-lg p-2">
            <div className="text-lg font-bold text-white mb-1">VS</div>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30 text-xs">
              Best of {match.bestOf || 1}
            </Badge>
          </div>
        </div>
        
        {/* Team 2 */}
        <div className="text-center">
          <img 
            src={match.teams[1]?.logo || '/placeholder.svg'} 
            alt={match.teams[1]?.name} 
            className="w-12 h-12 object-contain mx-auto mb-1 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h3 className="text-sm font-bold text-white truncate">{match.teams[1]?.name}</h3>
        </div>
      </div>

      {/* Match Information */}
      <div className="flex items-center justify-center gap-3 text-gray-400 text-xs flex-wrap">
        <div className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>{date}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          <span>{time}</span>
        </div>
        {match.faceitData?.region && (
          <div className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{match.faceitData.region}</span>
          </div>
        )}
      </div>
    </div>
  );
};
