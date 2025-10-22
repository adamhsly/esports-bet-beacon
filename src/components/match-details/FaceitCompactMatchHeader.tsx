
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trophy, MapPin, Bell, BellRing, Loader2, CheckCircle, Crown, Gamepad2 } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from "@/components/CountdownTimer";
import { getFaceitScore } from '@/utils/faceitScoreUtils';

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
    rawData?: any;
    liveTeamScores?: any;
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

  // Extract score from multiple sources using utility
  const faceitResult = getFaceitScore(match.rawData, match.faceitData, match.liveTeamScores);
  const hasScore = faceitResult.score !== null;

  // Helper functions for finished/live matches
  const isWinner = (teamIndex: number) => {
    if (!faceitResult.winner) return false;
    return faceitResult.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
  };

  const getScore = (teamIndex: number) => {
    if (!faceitResult.score) return '-';
    return teamIndex === 0 ? faceitResult.score.faction1 : faceitResult.score.faction2;
  };

  const getTeamStyling = (teamIndex: number) => {
    if (!isFinished() || !hasScore) return '';
    return isWinner(teamIndex) ? 'border-green-400 bg-green-500/10' : 'opacity-75';
  };

  const { date, time } = formatDateTime(match.startTime);
  const finishedTime = match.finishedTime || match.finished_at;

  return (
    <Card className="overflow-hidden relative bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(255,154,62,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(255,154,62,0.4)]">
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
            <span className="text-sm font-medium text-[#E8EAF5] truncate">{match.tournament}</span>
            <Badge variant="outline" className="bg-[#FF9A3E]/20 text-[#FF9A3E] border-[#FF9A3E]/30 text-xs">
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
              <span className="text-xs font-medium text-[#E8EAF5] text-center max-w-[60px] truncate">
                {match.teams[0]?.name}
              </span>
              {isFinished() && isWinner(0) && (
                <Crown className="h-3 w-3 text-green-400 mt-1" />
              )}
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center px-2">
              {hasScore ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-[#E8EAF5]">
                    <span className={isWinner(0) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(0)}
                    </span>
                    <span className="text-gray-500 mx-1">:</span>
                    <span className={isWinner(1) ? 'text-green-400' : 'text-gray-300'}>
                      {getScore(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {isFinished() ? 'Final' : 'Live'}
                  </span>
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
              <span className="text-xs font-medium text-[#E8EAF5] text-center max-w-[60px] truncate">
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
          <div className="flex items-center text-[#A8AEBF] text-xs gap-3">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {isFinished() && finishedTime 
                  ? new Date(finishedTime).toLocaleDateString() 
                  : isLive() 
                    ? new Date(match.startTime).toLocaleDateString()
                    : date
                }
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {isFinished() && finishedTime 
                  ? new Date(finishedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : isLive()
                    ? new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
            {match.rawData?.game && (
              <div className="flex items-center">
                <Gamepad2 className="h-3 w-3 mr-1" />
                <span>{match.rawData.game}</span>
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
                  disabled={isLoading || isFinished()}
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
