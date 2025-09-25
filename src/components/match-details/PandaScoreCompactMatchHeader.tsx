
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Clock, MapPin, Bell, BellRing, Loader2, CheckCircle, Crown } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import CountdownTimer from '@/components/CountdownTimer';
import { getPandaScoreLiveScore } from '@/utils/pandascoreScoreUtils';

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
    rawData?: any;
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

  // Time-based live status determination
  const isFinished = () => {
    const normalizedStatus = match.status?.toLowerCase() || '';
    return ['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus);
  };

  const isLive = () => {
    if (isFinished()) return false;
    const now = new Date();
    const matchStart = new Date(match.startTime);
    return now >= matchStart;
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

  const formatPrizePool = (prizePool: number | string) => {
    console.log('🎯 Compact Match Prize pool raw data:', prizePool, typeof prizePool);
    
    if (!prizePool) return null;
    
    let amount: number;
    
    if (typeof prizePool === 'string') {
      // Extract numbers from strings like "10000 United States Dollar"
      const numberMatch = prizePool.match(/\d+/);
      if (!numberMatch) return null;
      amount = parseInt(numberMatch[0]);
    } else {
      amount = prizePool;
    }
    
    console.log('🎯 Compact Match Parsed prize pool amount:', amount);
    
    if (isNaN(amount) || amount <= 0) return null;
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount}`;
    }
  };

  const getTournamentInfo = () => {
    const rawData = match.rawData;
    let prizePool = null;
    let tier = null;

    console.log('🎯 Compact Match Raw data for tournament info:', rawData);

    if (rawData?.tournament) {
      prizePool = rawData.tournament.prizepool;
      tier = rawData.tournament.tier;
      console.log('🎯 Compact Match Tournament prize pool:', prizePool, 'tier:', tier);
    }
    
    if (rawData?.league && !prizePool) {
      prizePool = rawData.league.prizepool;
      tier = tier || rawData.league.tier;
      console.log('🎯 Compact Match League prize pool:', prizePool, 'tier:', tier);
    }

    return { prizePool, tier };
  };

const { date, time } = formatDateTime(match.startTime);
const finished = isFinished();
const { prizePool, tier } = getTournamentInfo();
const formattedPrizePool = formatPrizePool(prizePool);
const live = isLive();
const liveScore = live ? getPandaScoreLiveScore(match.rawData, match.teams) : null;

console.log('🎯 Compact Match Final formatted prize pool:', formattedPrizePool);

  return (
    <Card className="overflow-hidden relative">
      <div className="p-3">
        {/* Tournament and Platform Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs">
              <Trophy size={10} className="mr-1" />
              PRO
            </Badge>
            {formattedPrizePool && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30 text-xs">
                <Trophy size={10} className="mr-1" />
                {formattedPrizePool}
              </Badge>
            )}
            {tier && tier !== 'unranked' && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-400/30 text-xs">
                {tier.toUpperCase()}
              </Badge>
            )}
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

{/* Countdown Timer, Live Score, or Final Score */}
{finished && match.results ? (
  <div className="mb-2 mt-[-0.5rem] text-center">
    <div className="text-lg font-bold text-green-400">
      {getScore(0)} - {getScore(1)}
    </div>
  </div>
) : live ? (
  <div className="mb-2 mt-[-0.5rem] text-center">
    <div className="text-lg font-bold text-white">
      {(liveScore?.a ?? 0)} - {(liveScore?.b ?? 0)}
    </div>
    <div className="mt-0.5 text-xs text-red-400 font-semibold flex items-center justify-center gap-1">
      <div className="h-2 w-2 bg-red-400 rounded-full animate-pulse" />
      <span>LIVE</span>
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
                className={isSubscribed ? 'bg-theme-purple hover:bg-theme-purple/80' : ''}
                onClick={toggleNotification}
                disabled={isLoading || isMatchInPast()}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                ) : isSubscribed ? (
                  <BellRing className="h-3 w-3 text-white" />
                ) : (
                  <Bell className="h-3 w-3 text-white" />
                )}
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
};
