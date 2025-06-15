
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
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
      <div className="p-4">
        {/* Top Section - Tournament and Badges */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-300">{match.tournament}</span>
              <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30">
                <Users size={12} className="mr-1" />
                FACEIT
              </Badge>
            </div>
            {match.faceitData?.region && (
              <span className="text-xs text-orange-400">{match.faceitData.region}</span>
            )}
          </div>
          <Badge className="bg-theme-purple">
            BO{match.bestOf || 1}
          </Badge>
        </div>

        {/* Teams Section */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {match.teams.map((team, index) => (
            <div key={team.name || index} className={`flex flex-1 items-center ${index === 1 ? 'flex-row-reverse' : ''}`}>
              <div className={`flex flex-col items-${index === 0 ? 'start' : 'end'} flex-1`}>
                <img
                  src={team.logo || '/placeholder.svg'}
                  alt={`${team.name} logo`}
                  className="w-12 h-12 object-contain mb-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <span className="text-sm font-bold text-white truncate">{team.name}</span>
              </div>
              {index === 0 && (
                <span className="mx-4 text-lg text-gray-400 font-bold">vs</span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Section - Time and Notification */}
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400 text-xs gap-3">
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

          {/* Notification Button */}
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
      </div>
    </Card>
  );
};
