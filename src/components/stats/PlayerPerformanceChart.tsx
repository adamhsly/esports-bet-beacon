
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface PlayerStats {
  player_id?: string;
  player_name?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  adr?: number;
  headshots?: number;
  flash_assists?: number;
  gpm?: number;
  xpm?: number;
  last_hits?: number;
  denies?: number;
  cs?: number;
  vision_score?: number;
  damage_dealt?: number;
  [key: string]: any;
}

interface PlayerPerformanceChartProps {
  playerStats: PlayerStats[];
  gameType?: 'csgo' | 'dota2' | 'lol';
  isLoading?: boolean;
}

const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  playerStats,
  gameType = 'csgo',
  isLoading = false
}) => {
  // Define relevant stats to display based on game type
  const relevantStats = useMemo(() => {
    switch (gameType) {
      case 'csgo':
        return [
          { key: 'kills', color: '#4CAF50', name: 'Kills' },
          { key: 'deaths', color: '#F44336', name: 'Deaths' },
          { key: 'assists', color: '#2196F3', name: 'Assists' },
          { key: 'adr', color: '#FF9800', name: 'ADR' },
          { key: 'headshots', color: '#9C27B0', name: 'Headshots' }
        ];
      case 'dota2':
        return [
          { key: 'kills', color: '#4CAF50', name: 'Kills' },
          { key: 'deaths', color: '#F44336', name: 'Deaths' },
          { key: 'assists', color: '#2196F3', name: 'Assists' },
          { key: 'gpm', color: '#FF9800', name: 'GPM' },
          { key: 'xpm', color: '#9C27B0', name: 'XPM' }
        ];
      case 'lol':
        return [
          { key: 'kills', color: '#4CAF50', name: 'Kills' },
          { key: 'deaths', color: '#F44336', name: 'Deaths' },
          { key: 'assists', color: '#2196F3', name: 'Assists' },
          { key: 'cs', color: '#FF9800', name: 'CS' },
          { key: 'vision_score', color: '#9C27B0', name: 'Vision' }
        ];
      default:
        return [
          { key: 'kills', color: '#4CAF50', name: 'Kills' },
          { key: 'deaths', color: '#F44336', name: 'Deaths' },
          { key: 'assists', color: '#2196F3', name: 'Assists' }
        ];
    }
  }, [gameType]);

  // Transform player stats for chart display
  const chartData = useMemo(() => {
    return playerStats.map(player => ({
      name: player.player_name || 'Unknown',
      ...relevantStats.reduce((acc, { key }) => {
        acc[key] = player[key] || 0;
        return acc;
      }, {} as Record<string, number>)
    }));
  }, [playerStats, relevantStats]);

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Users size={18} className="mr-2 text-theme-purple" />
            Player Performance
          </CardTitle>
          <Badge variant="outline">{gameType.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-b-2 border-theme-purple rounded-full"></div>
          </div>
        ) : playerStats.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No player statistics available
          </div>
        ) : (
          <div className="w-full" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" />
                <YAxis dataKey="name" type="category" width={80} stroke="#888" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1F2C', 
                    borderColor: '#333',
                    color: '#fff'
                  }} 
                />
                <Legend />
                {relevantStats.map(({ key, color, name }) => (
                  <Bar 
                    key={key}
                    dataKey={key}
                    name={name}
                    fill={color}
                    radius={[0, 4, 4, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerPerformanceChart;
