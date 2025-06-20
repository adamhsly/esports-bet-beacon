
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Clock, MapPin, Bell, BellRing, Loader2, CheckCircle, Crown } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from '@/components/CountdownTimer';

interface PandaScoreCompactMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string | number;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
    finishedTime?: string;
    finished_at?: string;
    results?: Array<{
      score: number;
      team_id: number;
    }>;
  };
  isMobile?: boolean;
}

export const PandaScoreCompactMatchHeader: React.FC<PandaScoreCompactMatchHeaderProps> = ({ 
  match, 
  isMobile = false 
}) => {
  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

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

  const isFinished = () => {
    const normalizedStatus = match.status?.toLowerCase() || '';
    return ['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus);
  };

  const isWinner = (teamIndex: number) => {
    if (!match.results || !match.results.length) return false;
    
    const team = match.teams[teamIndex];
    if (!team || !team.id) return false;
    
    // Find the result for this team
    const teamResult = match.results.find(r => r.team_id.toString() === team.id?.toString());
    if (!teamResult) return false;
    
    // Check if this team has the highest score
    const maxScore = Math.max(...match.results.map(r => r.score));
    return teamResult.score === maxScore && maxScore > 0;
  };

  const getScore = (teamIndex: number) => {
    if (!match.results || !match.results.length) return '-';
    
    const team = match.teams[teamIndex];
    if (!team || !team.id) return '-';
    
    const teamResult = match.results.find(r => r.team_id.toString() === team.id?.toString());
    return teamResult ? teamResult.score : '-';
  };

  const { date, time } = formatDateTime(match.startTime);
  const finished = isFinished();

  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
      <div className="p-3">
        {/* Tournament and Platform Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-white truncate">{match.tournament || 'Pro Match'}</span>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs">
              <Trophy size={10} className="mr-1" />
              PRO
            </Badge>
            {finished && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/20 text-green-400 border-green-400/30"
              >
                <CheckCircle size={10} className="mr-1" />
                FINISHED
              </Badge>
            )}
          </div>
          <Badge className="bg-theme-purple text-xs px-2 py-1">
            BO{match.bestOf || 3}
          </Badge>
        </div>

        {/* Countdown Timer or Final Score */}
        {finished && match.results ? (
          <div className="mb-2 mt-[-0.5rem] text-center">
            <div className="text-lg font-bold text-green-400">
              {getScore(0)} - {getScore(1)}
            </div>
          </div>
        ) : (
          <CountdownTimer targetTime={match.startTime} className="mb-2 mt-[-0.5rem]" />
        )}

        {/* Teams vs Section */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-3">
            {/* Team 1 */}
            <div className={`flex flex-col items-center ${finished && isWinner(0) ? 'ring-2 ring-green-400/50 rounded-lg p-1' : ''}`}>
              <div className="relative">
                <img
                  src={team1.logo || '/placeholder.svg'}
                  alt={`${team1.name} logo`}
                  className="w-10 h-10 object-contain mb-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {finished && isWinner(0) && (
                  <Crown className="h-4 w-4 text-green-400 absolute -top-1 -right-1" />
                )}
              </div>
              <span className="text-xs font-medium text-white text-center max-w-[60px] truncate">
                {team1.name}
              </span>
            </div>

            {/* VS */}
            <span className="text-lg font-bold text-gray-400 mx-2">vs</span>

            {/* Team 2 */}
            <div className={`flex flex-col items-center ${finished && isWinner(1) ? 'ring-2 ring-green-400/50 rounded-lg p-1' : ''}`}>
              <div className="relative">
                <img
                  src={team2.logo || '/placeholder.svg'}
                  alt={`${team2.name} logo`}
                  className="w-10 h-10 object-contain mb-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {finished && isWinner(1) && (
                  <Crown className="h-4 w-4 text-green-400 absolute -top-1 -right-1" />
                )}
              </div>
              <span className="text-xs font-medium text-white text-center max-w-[60px] truncate">
                {team2.name}
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
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="uppercase">{match.esportType}</span>
            </div>
          </div>

          {/* Notification Button - Icon only for mobile, hide for finished matches */}
          {!finished && (
            isChecking ? (
              <Button disabled variant="outline" size="icon">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Button>
            ) : (
              <Button 
                variant={isSubscribed ? "default" : "outline"}
                size="icon"
                className={isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}
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
            )
          )}
        </div>
      </div>
    </Card>
  );
};
