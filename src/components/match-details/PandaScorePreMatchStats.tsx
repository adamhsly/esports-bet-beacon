
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Target, Loader2 } from 'lucide-react';
import { calculateTeamStats, getHeadToHeadRecord } from '@/lib/teamStatsCalculator';

interface PandaScorePreMatchStatsProps {
  teams: Array<{
    name: string;
    logo?: string;
    id?: string;
  }>;
  tournament?: string;
  esportType?: string;
}

interface TeamStatsData {
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
}

export const PandaScorePreMatchStats: React.FC<PandaScorePreMatchStatsProps> = ({ 
  teams, 
  tournament, 
  esportType = 'csgo' 
}) => {
  const [team1Stats, setTeam1Stats] = useState<TeamStatsData | null>(null);
  const [team2Stats, setTeam2Stats] = useState<TeamStatsData | null>(null);
  const [headToHead, setHeadToHead] = useState<{ team1Wins: number; team2Wins: number; totalMatches: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const team1 = teams[0] || { name: 'Team 1' };
  const team2 = teams[1] || { name: 'Team 2' };

  useEffect(() => {
    const fetchTeamStats = async () => {
      setLoading(true);
      try {
        const promises = [];

        // Fetch team1 stats if we have an ID
        if (team1.id) {
          promises.push(calculateTeamStats(team1.id, esportType));
        } else {
          promises.push(Promise.resolve(null));
        }

        // Fetch team2 stats if we have an ID
        if (team2.id) {
          promises.push(calculateTeamStats(team2.id, esportType));
        } else {
          promises.push(Promise.resolve(null));
        }

        // Fetch head-to-head record if we have both IDs
        if (team1.id && team2.id) {
          promises.push(getHeadToHeadRecord(team1.id, team2.id, esportType));
        } else {
          promises.push(Promise.resolve(null));
        }

        const [stats1, stats2, h2h] = await Promise.all(promises);
        
        setTeam1Stats(stats1);
        setTeam2Stats(stats2);
        setHeadToHead(h2h);
      } catch (error) {
        console.error('Error fetching team stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [team1.id, team2.id, esportType]);

  const TeamStatsCard = ({ team, stats, side }: { team: any; stats: TeamStatsData | null; side: string }) => (
    <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
      <div className="flex items-center space-x-3 mb-4">
        <img 
          src={team.logo || '/placeholder.svg'} 
          alt={team.name} 
          className="w-8 h-8 object-contain rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <h4 className="text-white font-semibold">{team.name}</h4>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-theme-purple" />
        </div>
      ) : stats ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Win Rate</span>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
              {stats.winRate}%
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-gray-300 text-sm">Recent Form</span>
            </div>
            <span className="text-white text-sm font-mono">{stats.recentForm || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">Tournament Wins</span>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
              {stats.tournamentWins}
            </Badge>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Based on {stats.totalMatches} matches (last 6 months)
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-gray-400 text-sm">Win Rate</span>
            </div>
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30">
              N/A
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-gray-400 text-sm">Recent Form</span>
            </div>
            <span className="text-gray-400 text-sm">No data</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-gray-500" />
              <span className="text-gray-400 text-sm">Tournament Wins</span>
            </div>
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30">
              N/A
            </Badge>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            No historical data found
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Pre-Match Analysis</h3>
        {tournament && (
          <p className="text-gray-400">Tournament: {tournament}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamStatsCard team={team1} stats={team1Stats} side="left" />
        <TeamStatsCard team={team2} stats={team2Stats} side="right" />
      </div>

      <Card className="bg-theme-gray-dark border-theme-gray-medium p-6">
        <h4 className="text-lg font-bold text-white mb-4">Head-to-Head</h4>
        <div className="text-center">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-theme-purple" />
            </div>
          ) : headToHead && headToHead.totalMatches > 0 ? (
            <div>
              <p className="text-gray-400 mb-2">Last {headToHead.totalMatches} matches</p>
              <div className="flex items-center justify-center space-x-4">
                <span className="text-white font-semibold">{team1.name}</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                  {headToHead.team1Wins}-{headToHead.team2Wins}
                </Badge>
                <span className="text-white font-semibold">{team2.name}</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-2">No historical matchup data available</p>
              <div className="flex items-center justify-center space-x-4">
                <span className="text-white font-semibold">{team1.name}</span>
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30">0-0</Badge>
                <span className="text-white font-semibold">{team2.name}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
