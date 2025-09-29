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
    rawData?: any;
    results?: Array<{
      score: number;
      team_id: number;
    }>;
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

  const isFinished = () => {
    const normalizedStatus = match.status?.toLowerCase() || '';
    return ['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus);
  };

  const getScore = (teamIndex: number) => {
    if (!match.results || !match.results.length) return '-';
    const team = match.teams[teamIndex];
    if (!team || !team.id) return '-';
    const teamResult = match.results.find(r => r.team_id.toString() === (team.id as string).toString());
    return teamResult ? teamResult.score : '-';
  };

  const formatPrizePool = (prizePool: number | string) => {
    console.log('🎯 Prize pool raw data:', prizePool, typeof prizePool);
    
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
    
    console.log('🎯 Parsed prize pool amount:', amount);
    
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

    console.log('🎯 Raw data for tournament info:', rawData);

    if (rawData?.tournament) {
      prizePool = rawData.tournament.prizepool;
      tier = rawData.tournament.tier;
      console.log('🎯 Tournament prize pool:', prizePool, 'tier:', tier);
    }
    
    if (rawData?.league && !prizePool) {
      prizePool = rawData.league.prizepool;
      tier = tier || rawData.league.tier;
      console.log('🎯 League prize pool:', prizePool, 'tier:', tier);
    }

    return { prizePool, tier };
  };

  const { date, time } = formatDateTime(match.startTime);
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };
  const { prizePool, tier } = getTournamentInfo();
  const formattedPrizePool = formatPrizePool(prizePool);

  console.log('🎯 Final formatted prize pool:', formattedPrizePool);

  return (
    <Card className="mt-6 overflow-hidden">
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
              {formattedPrizePool && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                  <Trophy size={12} className="mr-1" />
                  {formattedPrizePool}
                </Badge>
              )}
              {tier && tier !== 'unranked' && (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-400/30">
                  {tier.toUpperCase()}
                </Badge>
              )}
            </div>
            <span className="text-sm text-blue-400 uppercase">{match.esportType}</span>
          </div>
          <Badge className="bg-theme-purple">
            BO{match.bestOf || 3}
          </Badge>
        </div>

        {/* Countdown Timer or Final Score */}
        {isFinished() && match.results?.length ? (
          <div className="mb-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {getScore(0)} - {getScore(1)}
            </div>
          </div>
        ) : (
          <CountdownTimer targetTime={match.startTime} />
        )}

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
