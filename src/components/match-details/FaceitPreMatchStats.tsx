
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Award, Clock, AlertTriangle } from 'lucide-react';

interface FaceitPreMatchStatsProps {
  teams: Array<{
    name: string;
    roster?: Array<{
      player_id: string;
      nickname: string;
      skill_level?: number;
      elo?: number;
      games?: number;
      total_matches?: number;
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
  
  // Check if we have sufficient data for meaningful analysis
  const hasValidTeamData = (team: any) => {
    return team?.roster && team.roster.length > 0;
  };

  const team1 = teams[0] || { name: 'Team 1' };
  const team2 = teams[1] || { name: 'Team 2' };
  const hasTeam1Data = hasValidTeamData(team1);
  const hasTeam2Data = hasValidTeamData(team2);
  const hasBothTeamsData = hasTeam1Data && hasTeam2Data;

  // Only calculate stats if we have real roster data
  const generateTeamStats = (team: any) => {
    const roster = team.roster || [];
    
    if (roster.length === 0) {
      return null; // Return null instead of fallback data
    }

    console.log(`📈 Calculating real stats for ${team.name} with ${roster.length} players:`, roster);
    
    // Only use data if we have meaningful values
    const skillLevels = roster
      .map((player: any) => player.skill_level)
      .filter((level: any) => level && level > 0);
    
    const elos = roster
      .map((player: any) => player.elo)
      .filter((elo: any) => elo && elo > 0);
    
    const gamesPlayed = roster
      .map((player: any) => player.games || player.total_matches)
      .filter((games: any) => games && games > 0);
    
    // Only return stats if we have data for at least half the roster
    const minDataThreshold = Math.ceil(roster.length / 2);
    
    return {
      avgSkillLevel: skillLevels.length >= minDataThreshold 
        ? (skillLevels.reduce((sum: number, level: number) => sum + level, 0) / skillLevels.length).toFixed(1)
        : null,
      avgElo: elos.length >= minDataThreshold 
        ? Math.round(elos.reduce((sum: number, elo: number) => sum + elo, 0) / elos.length)
        : null,
      rosterSize: roster.length,
      totalGamesPlayed: gamesPlayed.length > 0 
        ? gamesPlayed.reduce((sum: number, games: number) => sum + games, 0)
        : null,
      teamExperience: gamesPlayed.length >= minDataThreshold 
        ? Math.round(gamesPlayed.reduce((sum: number, games: number) => sum + games, 0) / gamesPlayed.length)
        : null,
      dataQuality: {
        skillLevels: skillLevels.length,
        elos: elos.length,
        gamesData: gamesPlayed.length,
        totalPlayers: roster.length
      }
    };
  };

  const team1Stats = generateTeamStats(team1);
  const team2Stats = generateTeamStats(team2);

  // Don't show comparison if we don't have meaningful data for both teams
  const canShowComparison = team1Stats && team2Stats && 
    team1Stats.avgSkillLevel && team2Stats.avgSkillLevel;

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

  // If we don't have sufficient data, show a minimal view
  if (!hasBothTeamsData || !canShowComparison) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-orange-400" />
          Match Information
        </h3>

        {/* Show what data we do have */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faceitData && (
            <>
              <StatCard title="Match Type" icon={<Award className="h-4 w-4 text-yellow-400" />}>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                    {faceitData.calculateElo ? 'ELO Ranked' : 'League Match'}
                  </Badge>
                  <p className="text-sm text-gray-400">
                    {faceitData.calculateElo ? 'ELO points at stake' : 'Standard league points at stake'}
                  </p>
                </div>
              </StatCard>

              <StatCard title="Competition Info" icon={<Users className="h-4 w-4 text-blue-400" />}>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-400">Type: </span>
                    <span className="text-white">{faceitData.competitionType || 'Competitive'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Region: </span>
                    <span className="text-white">{faceitData.region || 'EU'}</span>
                  </div>
                  {faceitData.calculateElo && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                      ELO Ranked
                    </Badge>
                  )}
                </div>
              </StatCard>

              <StatCard title="Match Format" icon={<Clock className="h-4 w-4 text-purple-400" />}>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-purple-400">Best of 1</div>
                  <p className="text-sm text-gray-400">Single map elimination</p>
                  <div className="text-xs text-gray-500">Map determined by veto process</div>
                </div>
              </StatCard>
            </>
          )}
        </div>

        {/* Data availability notice */}
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-2">Limited Pre-Match Analysis</h4>
              <div className="text-sm text-gray-400 space-y-1">
                {!hasTeam1Data && <p>• No roster data available for {team1.name}</p>}
                {!hasTeam2Data && <p>• No roster data available for {team2.name}</p>}
                <p>• Team comparison requires player statistics from both teams</p>
                <p>• Enhanced analysis will be available once player data is synced</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center">
        <TrendingUp className="h-5 w-5 mr-2 text-orange-400" />
        Pre-Match Intelligence
      </h3>

      {/* Team Comparison - only show if we have real data */}
      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
        <h4 className="text-lg font-semibold text-white mb-4 text-center">Team Comparison</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="font-bold text-orange-400">{team1.name}</div>
              <div className="text-xs text-gray-500">{team1Stats.rosterSize} players</div>
            </div>
            <div className="text-sm text-gray-400 px-4">VS</div>
            <div className="text-center flex-1">
              <div className="font-bold text-orange-400">{team2.name}</div>
              <div className="text-xs text-gray-500">{team2Stats.rosterSize} players</div>
            </div>
          </div>
          
          {team1Stats.avgSkillLevel && team2Stats.avgSkillLevel && (
            <TeamComparison 
              label="Avg Skill Level" 
              team1Value={team1Stats.avgSkillLevel}
              team2Value={team2Stats.avgSkillLevel}
              team1Better={parseFloat(team1Stats.avgSkillLevel) > parseFloat(team2Stats.avgSkillLevel)}
            />
          )}
          
          {team1Stats.avgElo && team2Stats.avgElo && (
            <TeamComparison 
              label="Average ELO" 
              team1Value={team1Stats.avgElo.toString()}
              team2Value={team2Stats.avgElo.toString()}
              team1Better={team1Stats.avgElo > team2Stats.avgElo}
            />
          )}
          
          {team1Stats.teamExperience && team2Stats.teamExperience && (
            <TeamComparison 
              label="Team Experience" 
              team1Value={`${team1Stats.teamExperience} avg games`}
              team2Value={`${team2Stats.teamExperience} avg games`}
              team1Better={team1Stats.teamExperience > team2Stats.teamExperience}
            />
          )}
          
          {team1Stats.totalGamesPlayed && team2Stats.totalGamesPlayed && (
            <TeamComparison 
              label="Total Games Played" 
              team1Value={team1Stats.totalGamesPlayed.toString()}
              team2Value={team2Stats.totalGamesPlayed.toString()}
              team1Better={team1Stats.totalGamesPlayed > team2Stats.totalGamesPlayed}
            />
          )}
        </div>

        {/* Data quality indicator */}
        <div className="mt-4 pt-4 border-t border-theme-gray-medium">
          <div className="text-xs text-gray-500">
            <p>Analysis based on {team1Stats.dataQuality.skillLevels + team2Stats.dataQuality.skillLevels} player skill levels, 
            {team1Stats.dataQuality.elos + team2Stats.dataQuality.elos} ELO ratings, 
            and {team1Stats.dataQuality.gamesData + team2Stats.dataQuality.gamesData} game history records</p>
          </div>
        </div>
      </Card>

      {/* Additional match info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {faceitData && (
          <>
            <StatCard title="Match Importance" icon={<Award className="h-4 w-4 text-yellow-400" />}>
              <div className="space-y-2">
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                  {faceitData.calculateElo ? 'ELO Ranked' : 'League Match'}
                </Badge>
                <p className="text-sm text-gray-400">
                  {faceitData.calculateElo ? 'ELO points at stake' : 'Standard league points at stake'}
                </p>
              </div>
            </StatCard>

            <StatCard title="Competition Info" icon={<Users className="h-4 w-4 text-blue-400" />}>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-400">Type: </span>
                  <span className="text-white">{faceitData.competitionType || 'Competitive'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">Region: </span>
                  <span className="text-white">{faceitData.region || 'EU'}</span>
                </div>
                {faceitData.calculateElo && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                    ELO Ranked
                  </Badge>
                )}
              </div>
            </StatCard>

            <StatCard title="Match Format" icon={<Clock className="h-4 w-4 text-purple-400" />}>
              <div className="space-y-2">
                <div className="text-lg font-bold text-purple-400">Best of 1</div>
                <p className="text-sm text-gray-400">Single map elimination</p>
                <div className="text-xs text-gray-500">Map determined by veto process</div>
              </div>
            </StatCard>
          </>
        )}
      </div>
    </div>
  );
};
