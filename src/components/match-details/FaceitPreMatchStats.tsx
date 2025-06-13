
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Award, Clock } from 'lucide-react';

interface FaceitPreMatchStatsProps {
  teams: Array<{
    name: string;
    roster?: Array<{
      player_id: string;
      nickname: string;
      skill_level?: number;
      elo?: number;
      games?: number;
    }>;
  }>;
  faceitData?: {
    region?: string;
    competitionType?: string;
    calculateElo?: boolean;
  };
}

export const FaceitPreMatchStats: React.FC<FaceitPreMatchStatsProps> = ({ teams, faceitData }) => {
  console.log('📊 Rendering FACEIT pre-match stats with real roster data:', teams);
  
  // Calculate real statistics based on actual roster data
  const generateTeamStats = (team: any) => {
    const roster = team.roster || [];
    
    if (roster.length > 0) {
      console.log(`📈 Calculating real stats for ${team.name} with ${roster.length} players:`, roster);
      
      // Calculate real averages from roster data
      const skillLevels = roster.map((player: any) => player.skill_level || 1);
      const elos = roster.map((player: any) => player.elo || 800);
      const gamesPlayed = roster.map((player: any) => player.games || 0);
      
      const avgSkillLevel = skillLevels.reduce((sum: number, level: number) => sum + level, 0) / skillLevels.length;
      const avgElo = elos.reduce((sum: number, elo: number) => sum + elo, 0) / elos.length;
      const totalGames = gamesPlayed.reduce((sum: number, games: number) => sum + games, 0);
      
      console.log(`✅ Real stats calculated: Avg Skill: ${avgSkillLevel.toFixed(1)}, Avg ELO: ${Math.round(avgElo)}, Total Games: ${totalGames}`);
      
      return {
        avgSkillLevel: avgSkillLevel.toFixed(1),
        avgElo: Math.round(avgElo),
        rosterSize: roster.length,
        totalGamesPlayed: totalGames,
        teamExperience: Math.round(totalGames / roster.length) // Average games per player
      };
    }
    
    // Fallback for teams without roster data
    console.log(`⚠️ No roster data for ${team.name}, using fallback values`);
    return {
      avgSkillLevel: '3.0',
      avgElo: 1000,
      rosterSize: 0,
      totalGamesPlayed: 0,
      teamExperience: 0
    };
  };

  const team1Stats = generateTeamStats(teams[0] || {});
  const team2Stats = generateTeamStats(teams[1] || {});

  const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4">
      <div className="flex items-center mb-3">
        {icon}
        <h4 className="text-sm font-semibold text-gray-300 ml-2">{title}</h4>
      </div>
      {children}
    </Card>
  );

  const TeamComparison: React.FC<{ label: string; team1Value: string; team2Value: string; team1Better?: boolean }> = ({ 
    label, team1Value, team2Value, team1Better 
  }) => (
    <div className="flex items-center justify-between p-3 bg-theme-gray-dark/50 rounded">
      <div className="text-center flex-1">
        <div className={`font-bold ${team1Better ? 'text-green-400' : 'text-white'}`}>{team1Value}</div>
      </div>
      <div className="text-sm text-gray-400 px-4">{label}</div>
      <div className="text-center flex-1">
        <div className={`font-bold ${!team1Better ? 'text-green-400' : 'text-white'}`}>{team2Value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center">
        <TrendingUp className="h-5 w-5 mr-2 text-orange-400" />
        Pre-Match Intelligence
      </h3>

      {/* Team Comparison */}
      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
        <h4 className="text-lg font-semibold text-white mb-4 text-center">Team Comparison</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="font-bold text-orange-400">{teams[0]?.name || 'Team 1'}</div>
              <div className="text-xs text-gray-500">{team1Stats.rosterSize} players</div>
            </div>
            <div className="text-sm text-gray-400 px-4">VS</div>
            <div className="text-center flex-1">
              <div className="font-bold text-orange-400">{teams[1]?.name || 'Team 2'}</div>
              <div className="text-xs text-gray-500">{team2Stats.rosterSize} players</div>
            </div>
          </div>
          
          <TeamComparison 
            label="Avg Skill Level" 
            team1Value={team1Stats.avgSkillLevel}
            team2Value={team2Stats.avgSkillLevel}
            team1Better={parseFloat(team1Stats.avgSkillLevel) > parseFloat(team2Stats.avgSkillLevel)}
          />
          
          <TeamComparison 
            label="Average ELO" 
            team1Value={team1Stats.avgElo.toString()}
            team2Value={team2Stats.avgElo.toString()}
            team1Better={team1Stats.avgElo > team2Stats.avgElo}
          />
          
          <TeamComparison 
            label="Team Experience" 
            team1Value={`${team1Stats.teamExperience} avg games`}
            team2Value={`${team2Stats.teamExperience} avg games`}
            team1Better={team1Stats.teamExperience > team2Stats.teamExperience}
          />
          
          <TeamComparison 
            label="Total Games Played" 
            team1Value={team1Stats.totalGamesPlayed.toString()}
            team2Value={team2Stats.totalGamesPlayed.toString()}
            team1Better={team1Stats.totalGamesPlayed > team2Stats.totalGamesPlayed}
          />
        </div>
      </Card>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Match Importance" icon={<Award className="h-4 w-4 text-yellow-400" />}>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
              {faceitData?.calculateElo ? 'ELO Ranked' : 'League Match'}
            </Badge>
            <p className="text-sm text-gray-400">
              {faceitData?.calculateElo ? 'ELO points at stake' : 'Standard league points at stake'}
            </p>
          </div>
        </StatCard>

        <StatCard title="Competition Info" icon={<Users className="h-4 w-4 text-blue-400" />}>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-400">Type: </span>
              <span className="text-white">{faceitData?.competitionType || 'Competitive'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Region: </span>
              <span className="text-white">{faceitData?.region || 'EU'}</span>
            </div>
            {faceitData?.calculateElo && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                ELO Ranked
              </Badge>
            )}
          </div>
        </StatCard>

        <StatCard title="Match Format" icon={<Clock className="h-4 w-4 text-purple-400" />}>
          <div className="space-y-2">
            <div className="text-lg font-bold text-purple-400">Best of 1</div>
            <p className="text-sm text-gray-400">
              Single map elimination
            </p>
            <div className="text-xs text-gray-500">
              Map determined by veto process
            </div>
          </div>
        </StatCard>
      </div>
    </div>
  );
};
