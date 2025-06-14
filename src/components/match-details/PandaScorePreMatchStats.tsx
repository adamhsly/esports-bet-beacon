
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Target } from 'lucide-react';

interface PandaScorePreMatchStatsProps {
  teams: Array<{
    name: string;
    logo?: string;
    id?: string;
  }>;
  tournament?: string;
}

export const PandaScorePreMatchStats: React.FC<PandaScorePreMatchStatsProps> = ({ teams, tournament }) => {
  const team1 = teams[0] || { name: 'Team 1' };
  const team2 = teams[1] || { name: 'Team 2' };

  // Mock data - in real implementation this would come from team stats
  const mockStats = {
    team1: {
      winRate: 75,
      recentForm: "W-W-L-W-W",
      tournamentWins: 3
    },
    team2: {
      winRate: 68,
      recentForm: "L-W-W-L-W",
      tournamentWins: 2
    }
  };

  const TeamStatsCard = ({ team, stats, side }: { team: any; stats: any; side: string }) => (
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
          <span className="text-white text-sm font-mono">{stats.recentForm}</span>
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
      </div>
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
        <TeamStatsCard team={team1} stats={mockStats.team1} side="left" />
        <TeamStatsCard team={team2} stats={mockStats.team2} side="right" />
      </div>

      <Card className="bg-theme-gray-dark border-theme-gray-medium p-6">
        <h4 className="text-lg font-bold text-white mb-4">Head-to-Head</h4>
        <div className="text-center">
          <p className="text-gray-400 mb-2">Historical matchup data</p>
          <div className="flex items-center justify-center space-x-4">
            <span className="text-white font-semibold">{team1.name}</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">2-1</Badge>
            <span className="text-white font-semibold">{team2.name}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
