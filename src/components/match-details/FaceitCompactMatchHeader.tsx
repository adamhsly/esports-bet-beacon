import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trophy, MapPin, Bell, BellRing, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from "@/components/CountdownTimer";

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
      <div className="p-3">
        {/* Tournament and Platform Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-white truncate">{match.tournament}</span>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30 text-xs">
              <Users size={10} className="mr-1" />
              FACEIT
            </Badge>
          </div>
          <Badge className="bg-theme-purple text-xs px-2 py-1">
            BO{match.bestOf || 1}
          </Badge>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer targetTime={match.startTime} className="mb-2 mt-[-0.5rem]" />

        {/* Teams vs Section */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-3">
            {/* Team 1 */}
            <div className="flex flex-col items-center">
              <img
                src={match.teams[0]?.logo || '/placeholder.svg'}
                alt={`${match.teams[0]?.name} logo`}
                className="w-10 h-10 object-contain mb-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-xs font-medium text-white text-center max-w-[60px] truncate">
                {match.teams[0]?.name}
              </span>
            </div>

            {/* VS */}
            <span className="text-lg font-bold text-gray-400 mx-2">vs</span>

            {/* Team 2 */}
            <div className="flex flex-col items-center">
              <img
                src={match.teams[1]?.logo || '/placeholder.svg'}
                alt={`${match.teams[1]?.name} logo`}
                className="w-10 h-10 object-contain mb-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-xs font-medium text-white text-center max-w-[60px] truncate">
                {match.teams[1]?.name}
              </span>
            </div>
          </div>
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

          {/* Notification Button - Icon only for mobile */}
          {isChecking ? (
            <Button disabled variant="outline" size="icon">
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
          ) : (
            <Button 
              variant={isSubscribed ? "default" : "outline"}
              size="icon"
              className={isSubscribed ? 'bg-orange-500 hover:bg-orange-600' : ''}
              onClick={toggleNotification}
              disabled={isLoading || isMatchInPast()}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isSubscribed ? (
                <BellRing className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
