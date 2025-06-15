
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Clock, MapPin, Bell, BellRing, Loader2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from '@/components/CountdownTimer';

interface PandaScoreMatchHeaderProps {
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
}

export const PandaScoreMatchHeader: React.FC<PandaScoreMatchHeaderProps> = ({ match }) => {
  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const isMatchInPast = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    return startTime.getTime() < now.getTime();
  };

  const { date, time } = formatDateTime(match.startTime);
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
      <div className="p-6">
        {/* Top Section - Tournament and Badges */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg text-gray-300">{match.tournament || 'Pro Match'}</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                <Trophy size={12} className="mr-1" />
                PRO
              </Badge>
            </div>
            <span className="text-sm text-blue-400 uppercase">{match.esportType}</span>
          </div>
          <Badge className="bg-theme-purple">
            BO{match.bestOf || 3}
          </Badge>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer targetTime={match.startTime} />

        {/* Teams Section */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {[team1, team2].map((team, index) => (
            <div
              key={team.name || index}
              className={`flex flex-1 items-center ${index === 1 ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex flex-col items-${index === 0 ? 'start' : 'end'} flex-1`}>
                <img
                  src={team.logo || '/placeholder.svg'}
                  alt={`${team.name} logo`}
                  className="w-20 h-20 object-contain mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <span className="text-xl font-bold text-white">{team.name}</span>
              </div>
              {index === 0 && (
                <span className="mx-6 text-2xl text-gray-400 font-bold">vs</span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Section - Time and Notification */}
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400 text-sm gap-4">
            <div className="flex items-center">
              <Calendar size={14} className="mr-1.5" />
              <span>{date}</span>
            </div>
            <div className="flex items-center">
              <Clock size={14} className="mr-1.5" />
              <span>{time}</span>
            </div>
            <div className="flex items-center">
              <MapPin size={14} className="mr-1.5" />
              <span className="uppercase">{match.esportType}</span>
            </div>
          </div>

          {/* Notification Button */}
          {isChecking ? (
            <Button disabled variant="outline">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </Button>
          ) : (
            <Button
              variant={isSubscribed ? "default" : "outline"}
              className={isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}
              onClick={toggleNotification}
              disabled={isLoading || isMatchInPast()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isSubscribed ? (
                <>
                  <BellRing className="h-4 w-4 mr-2" />
                  Subscribed
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Notify Me
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
