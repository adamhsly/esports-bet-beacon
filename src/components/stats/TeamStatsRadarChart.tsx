
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { BarChart } from 'lucide-react';

interface TeamStats {
  [key: string]: any;
  // CSGO stats
  rounds_won?: number;
  rounds_lost?: number;
  bomb_plants?: number;
  bomb_defuses?: number;
  first_kills?: number;
  
  // Dota2 stats
  towers_destroyed?: number;
  roshans_killed?: number;
  team_fights_won?: number;
  wards_placed?: number;
  
  // LoL stats
  dragons?: number;
  barons?: number;
  towers?: number;
  inhibitors?: number;
  heralds?: number;
}

interface TeamStatsRadarChartProps {
  teamStats: TeamStats;
  opponentStats?: TeamStats;
  gameType?: 'csgo' | 'dota2' | 'lol';
  isLoading?: boolean;
}

const TeamStatsRadarChart: React.FC<TeamStatsRadarChartProps> = ({
  teamStats,
  opponentStats,
  gameType = 'csgo',
  isLoading = false
}) => {
  // Define relevant stats to display based on game type
  const relevantStats = useMemo(() => {
    switch (gameType) {
      case 'csgo':
        return [
          { key: 'rounds_won', name: 'Rounds Won' },
          { key: 'bomb_plants', name: 'Bomb Plants' },
          { key: 'bomb_defuses', name: 'Bomb Defuses' },
          { key: 'first_kills', name: 'First Kills' },
          { key: 'clutches', name: 'Clutches' }
        ];
      case 'dota2':
        return [
          { key: 'towers_destroyed', name: 'Towers' },
          { key: 'roshans_killed', name: 'Roshans' },
          { key: 'team_fights_won', name: 'Team Fights' },
          { key: 'wards_placed', name: 'Wards' },
          { key: 'courier_kills', name: 'Courier Kills' }
        ];
      case 'lol':
        return [
          { key: 'dragons', name: 'Dragons' },
          { key: 'barons', name: 'Barons' },
          { key: 'towers', name: 'Towers' },
          { key: 'inhibitors', name: 'Inhibitors' },
          { key: 'heralds', name: 'Heralds' }
        ];
      default:
        return [
          { key: 'kills', name: 'Kills' },
          { key: 'deaths', name: 'Deaths' },
          { key: 'objectives', name: 'Objectives' }
        ];
    }
  }, [gameType]);

  // Transform team stats for radar chart
  const chartData = useMemo(() => {
    return relevantStats.map(({ key, name }) => {
      // Get stat values with fallback to zero
      const teamValue = teamStats[key] || 0;
      const opponentValue = opponentStats ? (opponentStats[key] || 0) : 0;
      
      // Calculate fullMark as slightly higher than max value for better visualization
      const maxValue = Math.max(teamValue, opponentValue);
      const fullMark = Math.max(maxValue * 1.2, 5); // At least 5 for small numbers
      
      return {
        subject: name,
        team: teamValue,
        opponent: opponentValue,
        fullMark: fullMark
      };
    });
  }, [teamStats, opponentStats, relevantStats]);

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <BarChart size={18} className="mr-2 text-theme-purple" />
            Team Performance
          </CardTitle>
          <Badge variant="outline">{gameType.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-b-2 border-theme-purple rounded-full"></div>
          </div>
        ) : Object.keys(teamStats).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No team statistics available
          </div>
        ) : (
          <div className="w-full" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#444" />
                <PolarAngleAxis dataKey="subject" stroke="#888" />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#888" />
                <Radar
                  name="Team"
                  dataKey="team"
                  stroke="#9b87f5"
                  fill="#9b87f5"
                  fillOpacity={0.6}
                />
                {opponentStats && (
                  <Radar
                    name="Opponent"
                    dataKey="opponent"
                    stroke="#F44336"
                    fill="#F44336"
                    fillOpacity={0.6}
                  />
                )}
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1F2C', 
                    borderColor: '#333',
                    color: '#fff'
                  }} 
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamStatsRadarChart;
