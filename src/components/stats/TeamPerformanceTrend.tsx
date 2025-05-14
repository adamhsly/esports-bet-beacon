
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface Match {
  id: string;
  start_time: string;
  tournament_name?: string;
  result?: string;
  playerStats?: any[];
  teamStats?: any;
}

interface TeamPerformanceTrendProps {
  matches: Match[];
  gameType?: 'csgo' | 'dota2' | 'lol';
  isLoading?: boolean;
}

const TeamPerformanceTrend: React.FC<TeamPerformanceTrendProps> = ({
  matches,
  gameType = 'csgo',
  isLoading = false
}) => {
  // Define metrics to track based on game type
  const metrics = useMemo(() => {
    switch (gameType) {
      case 'csgo':
        return [
          { key: 'winRate', name: 'Win Rate', color: '#4CAF50' },
          { key: 'killsPerMatch', name: 'Kills per Match', color: '#2196F3' },
          { key: 'roundWinRate', name: 'Round Win Rate', color: '#FF9800' }
        ];
      case 'dota2':
        return [
          { key: 'winRate', name: 'Win Rate', color: '#4CAF50' },
          { key: 'killsPerMatch', name: 'Kills per Match', color: '#2196F3' },
          { key: 'towersPerMatch', name: 'Towers per Match', color: '#FF9800' }
        ];
      case 'lol':
        return [
          { key: 'winRate', name: 'Win Rate', color: '#4CAF50' },
          { key: 'killsPerMatch', name: 'Kills per Match', color: '#2196F3' },
          { key: 'objectivesPerMatch', name: 'Objectives per Match', color: '#FF9800' }
        ];
      default:
        return [
          { key: 'winRate', name: 'Win Rate', color: '#4CAF50' },
          { key: 'killsPerMatch', name: 'Kills per Match', color: '#2196F3' }
        ];
    }
  }, [gameType]);

  // Calculate trend data from matches
  const trendData = useMemo(() => {
    // Sort matches by date in ascending order
    const sortedMatches = [...matches].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    let winCount = 0;
    
    return sortedMatches.map((match, index) => {
      // Calculate win count
      if (match.result?.toLowerCase() === 'win') {
        winCount++;
      }
      
      // Calculate cumulative win rate
      const winRate = ((winCount / (index + 1)) * 100).toFixed(2);
      
      // Calculate kills per match (total team kills)
      const totalKills = match.playerStats?.reduce((sum, player) => sum + (player.kills || 0), 0) || 0;
      
      // Calculate game-specific metrics
      let roundWinRate = 0;
      let towersPerMatch = 0;
      let objectivesPerMatch = 0;
      
      if (gameType === 'csgo' && match.teamStats) {
        const roundsWon = match.teamStats.rounds_won || 0;
        const roundsLost = match.teamStats.rounds_lost || 0;
        roundWinRate = roundsWon > 0 ? ((roundsWon / (roundsWon + roundsLost)) * 100) : 0;
      } else if (gameType === 'dota2' && match.teamStats) {
        towersPerMatch = match.teamStats.towers_destroyed || 0;
      } else if (gameType === 'lol' && match.teamStats) {
        objectivesPerMatch = (
          (match.teamStats.dragons || 0) + 
          (match.teamStats.barons || 0) + 
          (match.teamStats.heralds || 0)
        );
      }
      
      const date = new Date(match.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      return {
        name: date,
        winRate: parseFloat(winRate),
        killsPerMatch: totalKills,
        roundWinRate,
        towersPerMatch,
        objectivesPerMatch,
        tournament: match.tournament_name || 'Unknown'
      };
    });
  }, [matches, gameType]);

  // Custom tooltip to show additional match info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-theme-gray-dark p-3 border border-theme-gray-medium rounded shadow">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-xs text-gray-400 mb-2">{payload[0]?.payload.tournament}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
  
    return null;
  };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp size={18} className="mr-2 text-theme-purple" />
            Performance Trend
          </CardTitle>
          <Badge variant="outline">{gameType.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-b-2 border-theme-purple rounded-full"></div>
          </div>
        ) : matches.length < 2 ? (
          <div className="text-center py-12 text-gray-400">
            Not enough match data for trend analysis
          </div>
        ) : (
          <div className="w-full" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {metrics.map(metric => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.name}
                    stroke={metric.color}
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceTrend;
