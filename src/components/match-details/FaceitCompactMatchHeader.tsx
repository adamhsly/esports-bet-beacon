
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trophy, MapPin, Bell, BellRing, Loader2, CheckCircle, Crown } from 'lucide-react';
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
    status?: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      organizedBy?: string;
      calculateElo?: boolean;
      results?: {
        winner: string;
        score: {
          faction1: number;
          faction2: number;
        };
      };
    };
    bestOf?: number;
    finishedTime?: string;
    finished_at?: string;
  };
  isMobile?: boolean;
}

export const FaceitCompactMatchHeader: React.FC<FaceitCompactMatchHeaderProps> = ({ match, isMobile = false }) => {
  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

  const formatDateTime = (dateString: string) => {
    if (!dateString) {
      return { date: 'TBC', time: 'TBC' };
    }
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

  // Time-based live status determination
  const isFinished = () => {
    const status = match.status?.toLowerCase() || '';
    return ['finished', 'completed', 'cancelled', 'aborted'].includes(status);
  };

  const isLive = () => {
    if (isFinished()) return false;
    const now = new Date();
    const matchStart = new Date(match.startTime);
    return now >= matchStart;
  };

  // Helper functions for finished matches
  const isWinner = (teamIndex: number) => {
    if (!match.faceitData?.results) return false;
    return match.faceitData.results.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
  };

  const getScore = (teamIndex: number) => {
    if (!match.faceitData?.results) return '-';
    return teamIndex === 0 ? match.faceitData.results.score.faction1 : match.faceitData.results.score.faction2;
  };

  const getTeamStyling = (teamIndex: number) => {
    if (!isFinished() || !match.faceitData?.results) return '';
    return isWinner(teamIndex) ? 'border-green-400 bg-green-500/10' : 'opacity-75';
  };

  const { date, time } = formatDateTime(match.startTime);
  const finishedTime = match.finishedTime || match.finished_at;

  return (
    <Card className={`${isFinished() ? 'bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-green-900/20 border-green-500/30' : 'bg-theme-gray-dark border-theme-gray-medium'} overflow-hidden relative`}>
      <div className="p-3">
        {/* Tournament and Platform Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            {isLive() && (
              <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                <div className="h-2 w-2 bg-red-400 rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
            )}
            <span className="text-sm font-medium text-white truncate">{match.tournament}</span>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30 text-xs">
              <Users size={10} className="mr-1" />
              FACEIT
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-theme-purple text-xs px-2 py-1">
              BO{match.bestOf || 1}
            </Badge>
            {isFinished() && (
              <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                FINISHED
              </Badge>
            )}
          </div>
        </div>

        {/* Countdown Timer or Match Status */}
        {!isFinished() && (
          <CountdownTimer targetTime={match.startTime} className="mb-2 mt-[-0.5rem]" />
        )}

        {/* Teams vs Section with Score for Finished Matches */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-3 w-full">
            {/* Team 1 */}
            <div className={`flex flex-col items-center flex-1 rounded-lg p-2 border ${getTeamStyling(0)}`}>
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
              {isFinished() && isWinner(0) && (
                <Crown className="h-3 w-3 text-green-400 mt-1" />
              )}
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center px-2">
              {isFinished() && match.faceitData?.results ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    <span className={isWinner(0) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(0)}
                    </span>
                    <span className="text-gray-500 mx-1">:</span>
                    <span className={isWinner(1) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Final</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-400">vs</span>
              )}
            </div>

            {/* Team 2 */}
            <div className={`flex flex-col items-center flex-1 rounded-lg p-2 border ${getTeamStyling(1)}`}>
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
              {isFinished() && isWinner(1) && (
                <Crown className="h-3 w-3 text-green-400 mt-1" />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Time and Notification */}
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400 text-xs gap-3">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{isFinished() && finishedTime ? new Date(finishedTime).toLocaleDateString() : date}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {isFinished() && finishedTime 
                  ? new Date(finishedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : time
                }
              </span>
            </div>
            {match.faceitData?.region && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{match.faceitData.region}</span>
              </div>
            )}
          </div>

          {/* Notification Button - Only show for upcoming matches */}
          {!isFinished() && (
            <>
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
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
