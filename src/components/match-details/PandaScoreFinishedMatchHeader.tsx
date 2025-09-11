
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, Calendar, Crown, Trophy } from 'lucide-react';

interface PandaScoreFinishedMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      avatar?: string;
      id?: string | number;
      roster?: Array<{
        nickname: string;
        player_id: string;
        position?: string;
      }>;
    }>;
    startTime: string;
    finishedTime?: string;
    finished_at?: string;
    tournament?: string;
    tournament_name?: string;
    league_name?: string;
    serie_name?: string;
    results?: Array<{
      score: number;
      team_id: number;
    }>;
    status: string;
    rawData?: any;
  };
}

export const PandaScoreFinishedMatchHeader: React.FC<PandaScoreFinishedMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };
  const results = match.results;
  const finishedTime = match.finishedTime || match.finished_at;

  const getMatchDuration = () => {
    if (!finishedTime) return 'Unknown duration';
    
    const startTime = new Date(match.startTime);
    const endTime = new Date(finishedTime);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isWinner = (teamIndex: number) => {
    if (!results || !results.length) return false;
    
    const team = match.teams[teamIndex];
    if (!team || !team.id) return false;
    
    // Find the result for this team
    const teamResult = results.find(r => r.team_id.toString() === team.id?.toString());
    if (!teamResult) return false;
    
    // Check if this team has the highest score
    const maxScore = Math.max(...results.map(r => r.score));
    return teamResult.score === maxScore && maxScore > 0;
  };

  const getTeamStyling = (teamIndex: number) => {
    if (!results) return '';
    return isWinner(teamIndex) ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
  };

  const getScore = (teamIndex: number) => {
    if (!results || !results.length) return '-';
    
    const team = match.teams[teamIndex];
    if (!team || !team.id) return '-';
    
    const teamResult = results.find(r => r.team_id.toString() === team.id?.toString());
    return teamResult ? teamResult.score : '-';
  };

  const getTournamentName = () => {
    return match.tournament_name || match.tournament || match.league_name || match.serie_name || 'PandaScore Match';
  };

  const getScoreDisplay = () => {
    if (!results || !results.length) return 'FINISHED';
    return `${getScore(0)} - ${getScore(1)}`;
  };

  const formatPrizePool = (prizePool: number | string) => {
    console.log('🎯 Finished Match Prize pool raw data:', prizePool, typeof prizePool);
    
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
    
    console.log('🎯 Finished Match Parsed prize pool amount:', amount);
    
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

    console.log('🎯 Finished Match Raw data for tournament info:', rawData);

    if (rawData?.tournament) {
      prizePool = rawData.tournament.prizepool;
      tier = rawData.tournament.tier;
      console.log('🎯 Finished Match Tournament prize pool:', prizePool, 'tier:', tier);
    }
    
    if (rawData?.league && !prizePool) {
      prizePool = rawData.league.prizepool;
      tier = tier || rawData.league.tier;
      console.log('🎯 Finished Match League prize pool:', prizePool, 'tier:', tier);
    }

    return { prizePool, tier };
  };

  const { prizePool, tier } = getTournamentInfo();
  const formattedPrizePool = formatPrizePool(prizePool);

  console.log('🎯 Finished Match Final formatted prize pool:', formattedPrizePool);

  return (
    <Card className="bg-slate-700 border border-theme-gray-medium rounded-xl">
      <div className="flex flex-col gap-2 px-3 py-3">
        {/* Tournament info and finished status row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-gray-400 truncate max-w-[45%] font-medium">
              {getTournamentName()}
            </span>
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
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400 font-semibold">
            <CheckCircle size={14} />
            <span>{getScoreDisplay()}</span>
          </div>
        </div>
        
        {/* Teams row */}
        <div className="flex items-center justify-between min-h-10">
          {/* Team 1 */}
          <div className={`flex items-center gap-2 flex-1 rounded-lg p-2 transition-all ${getTeamStyling(0)}`}>
            <img
              src={team1.logo || team1.avatar || '/placeholder.svg'}
              alt={`${team1.name} logo`}
              className="w-8 h-8 object-contain rounded-md bg-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <span className="truncate font-semibold text-sm text-white max-w-[90px]">{team1.name}</span>
            {isWinner(0) && (
              <Crown className="h-4 w-4 text-green-400 ml-1" />
            )}
          </div>
          
          <span className="text-md font-bold text-gray-400 mx-2">vs</span>
          
          {/* Team 2 */}
          <div className={`flex items-center gap-2 flex-1 justify-end rounded-lg p-2 transition-all ${getTeamStyling(1)}`}>
            {isWinner(1) && (
              <Crown className="h-4 w-4 text-green-400 mr-1" />
            )}
            <span className="truncate font-semibold text-sm text-white max-w-[90px] text-right">{team2.name}</span>
            <img
              src={team2.logo || team2.avatar || '/placeholder.svg'}
              alt={`${team2.name} logo`}
              className="w-8 h-8 object-contain rounded-md bg-gray-800"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>
        </div>
        
        {/* Bottom info row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/20 text-blue-400 border-blue-400/30"
            >
              <Users size={10} className="mr-1" />
              PROFESSIONAL
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/20 text-green-400 border-green-400/30 ml-1"
            >
              <CheckCircle size={10} className="mr-1" />
              FINISHED
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{finishedTime ? new Date(finishedTime).toLocaleDateString() : new Date(match.startTime).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {finishedTime 
                  ? new Date(finishedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : getMatchDuration()
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
