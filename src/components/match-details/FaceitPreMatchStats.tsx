import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Loader2 } from 'lucide-react';
import { getFaceitHeadToHead, getFaceitTeamStats } from '@/lib/teamStatsCalculator';
import type { HeadToHead, TeamStatsData } from '@/lib/teamStatsCalculator';

interface FaceitPreMatchStatsProps {
  teams: Array<{
    name: string;
    logo?: string;
  }>;
  matchId?: string;
  game?: string;
}

export const FaceitPreMatchStats: React.FC<FaceitPreMatchStatsProps> = ({ 
  teams, 
  matchId,
  game = 'cs2'
}) => {
  const [team1Stats, setTeam1Stats] = useState<TeamStatsData | null>(null);
  const [team2Stats, setTeam2Stats] = useState<TeamStatsData | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHead | null>(null);
  const [loading, setLoading] = useState(true);

  const team1 = teams[0] || { name: 'Team 1' };
  const team2 = teams[1] || { name: 'Team 2' };

  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!matchId || !teams || teams.length < 2) {
        setLoading(false);
        return;
      }

      const team1Name = teams[0]?.name;
      const team2Name = teams[1]?.name;

      console.log('🔍 FaceitPreMatchStats - Input data:', {
        matchId,
        game,
        team1Name,
        team2Name,
        fullTeamsObject: teams
      });

      if (!team1Name || !team2Name) {
        setLoading(false);
        console.warn('FaceitPreMatchStats: Missing team names');
        return;
      }
      
      setLoading(true);
      try {
        const promises = [];

        // Fetch team1 stats via faceit_team_form RPC
        console.log('📊 Calling getFaceitTeamStats for team1:', { team1Name, game });
        promises.push(getFaceitTeamStats(team1Name, game));
        
        // Fetch team2 stats via faceit_team_form RPC
        console.log('📊 Calling getFaceitTeamStats for team2:', { team2Name, game });
        promises.push(getFaceitTeamStats(team2Name, game));

        // Fetch head-to-head record
        console.log('⚔️ Calling getFaceitHeadToHead:', { team1Name, team2Name, game, matchId });
        promises.push(getFaceitHeadToHead(team1Name, team2Name, game, matchId, 6));

        const [stats1, stats2, h2h] = await Promise.all(promises);
        
        console.log('✅ RPC Results:', {
          team1Stats: stats1,
          team2Stats: stats2,
          headToHead: h2h
        });
        
        console.log('📊 FACEIT Team Stats Fetched:', { stats1, stats2, h2h });
        
        setTeam1Stats(stats1);
        setTeam2Stats(stats2);
        setHeadToHead(h2h);
      } catch (error) {
        console.error('❌ Error fetching FACEIT team stats:', error);
      } finally {
        setLoading(false);
        console.log('🏁 FaceitPreMatchStats loading complete');
      }
    };

    fetchTeamStats();
  }, [matchId, teams, game]);

  const TeamStatsCard = ({ team, stats }: { team: any; stats: TeamStatsData | null }) => (
    <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)] p-4">
      <div className="flex items-center space-x-3 mb-4">
        <img 
          src={team.logo || '/placeholder.svg'} 
          alt={team.name} 
          className="w-8 h-8 object-contain rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <h4 className="text-[#E8EAF5] font-semibold">{team.name}</h4>
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
            <div className="flex items-center gap-0.5 sm:gap-1">
              {(stats.recentForm || 'N/A').split('').map((char, index) => (
                <span
                  key={index}
                  className={`
                    text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center
                    ${char === 'W' ? 'bg-green-500 text-white' : 
                      char === 'L' ? 'bg-red-500 text-white' : 
                      'bg-gray-500 text-white'}
                  `}
                >
                  {char}
                </span>
              ))}
            </div>
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

          <div className="text-xs text-gray-400 mt-2">
            No historical data found
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overall Team Performance Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-theme-purple" />
          <h4 className="text-lg font-bold text-white">Overall Team Performance</h4>
        </div>
        <p className="text-gray-400 text-sm">Individual team statistics Last 6 Months</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamStatsCard team={team1} stats={team1Stats} />
          <TeamStatsCard team={team2} stats={team2Stats} />
        </div>
      </div>

      {/* Head-to-Head History Section */}
      <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)] p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-theme-purple" />
          <h4 className="text-lg font-bold text-white">Head-to-Head History</h4>
        </div>
        <p className="text-gray-400 text-sm mb-4">Direct matchup record between these teams</p>
        <div className="text-center">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-theme-purple" />
            </div>
          ) : headToHead && headToHead.totalMatches > 0 ? (
            <div>
              <p className="text-gray-400 mb-2">Previous meetings: {headToHead.totalMatches} matches</p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-white font-semibold text-lg">{team1.name}</div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30 mt-1">
                    {headToHead.team1Wins} wins
                  </Badge>
                </div>
                <div className="text-gray-400 font-bold text-2xl">VS</div>
                <div className="text-center">
                  <div className="text-white font-semibold text-lg">{team2.name}</div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-400/30 mt-1">
                    {headToHead.team2Wins} wins
                  </Badge>
                </div>
              </div>
              {headToHead.team1Wins !== headToHead.team2Wins && (
                <p className="text-gray-400 text-sm mt-3">
                  {headToHead.team1Wins > headToHead.team2Wins ? team1.name : team2.name} leads the series
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-2">No previous matchups found</p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-white font-semibold text-lg">{team1.name}</div>
                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 mt-1">0 wins</Badge>
                </div>
                <div className="text-gray-400 font-bold text-2xl">VS</div>
                <div className="text-center">
                  <div className="text-white font-semibold text-lg">{team2.name}</div>
                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 mt-1">0 wins</Badge>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-3">This will be their first recorded meeting</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
