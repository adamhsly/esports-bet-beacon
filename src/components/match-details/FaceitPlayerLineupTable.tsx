import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Trophy, Target, TrendingUp, Loader2 } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';
import { FaceitPlayerDetailsModal } from './FaceitPlayerDetailsModal';
import { supabase } from '@/integrations/supabase/client';
interface Player {
  nickname: string;
  player_id: string;
  skill_level?: number;
  avatar?: string;
  total_matches?: number;
  win_rate?: number;
  kd_ratio?: number;
  recent_form?: string;
  recent_form_string?: string;
  // Enhanced stats from faceit_player_stats
  faceit_elo?: number;
  avg_headshots_percent?: number;
  current_win_streak?: number;
  longest_win_streak?: number;
  membership?: string;
  country?: string;
  map_stats?: any;
  recent_results?: any[];
  match_history?: Array<{
    id: string;
    match_id: string;
    match_date: string;
    map_name?: string;
    team_name?: string;
    opponent_team_name?: string;
    match_result: 'win' | 'loss';
    competition_name?: string;
    competition_type?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    kd_ratio?: number;
    headshots?: number;
    headshots_percent?: number;
    mvps?: number;
    adr?: number;
    faceit_elo_change?: number;
  }>;
}
interface Team {
  id?: string;
  name: string;
  logo?: string;
  avatar?: string;
  roster?: Player[];
}
interface FaceitPlayerLineupTableProps {
  teams: Team[];
}

// Helper function to get color for skill level
const getSkillLevelColor = (level?: number): string => {
  if (!level) return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  if (level >= 9) return 'bg-purple-500/20 text-purple-300 border-purple-400/30'; // Purple for 9-10
  if (level >= 7) return 'bg-orange-500/20 text-orange-300 border-orange-400/30'; // Orange for 7-8
  if (level >= 5) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'; // Yellow for 5-6
  if (level >= 3) return 'bg-green-500/20 text-green-300 border-green-400/30'; // Green for 3-4
  return 'bg-red-500/20 text-red-300 border-red-400/30'; // Red for 1-2
};
export const FaceitPlayerLineupTable: React.FC<FaceitPlayerLineupTableProps> = ({
  teams
}) => {
  const isMobile = useMobile();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enhancedTeams, setEnhancedTeams] = useState<Team[]>(teams);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch enhanced player stats from faceit_player_stats table
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!teams.length) return;
      setIsLoadingStats(true);
      try {
        // Collect all player IDs from both teams
        const allPlayerIds = teams.flatMap(team => (team.roster || []).map(player => player.player_id)).filter(Boolean);
        if (allPlayerIds.length === 0) {
          setIsLoadingStats(false);
          return;
        }

        // Fetch stats for all players in one query
        const {
          data: playerStats,
          error
        } = await supabase.from('faceit_player_stats').select('*').in('player_id', allPlayerIds);
        if (error) {
          console.error('Error fetching player stats:', error);
          setIsLoadingStats(false);
          return;
        }

        // Create a map of player stats by player_id
        const statsMap = new Map();
        (playerStats || []).forEach(stat => {
          statsMap.set(stat.player_id, stat);
        });

        // Enhance teams with fetched stats
        const enhanced = teams.map(team => ({
          ...team,
          roster: (team.roster || []).map(player => {
            const stats = statsMap.get(player.player_id);
            if (stats) {
              return {
                ...player,
                skill_level: stats.skill_level || player.skill_level,
                // Use skill_level from faceit_player_stats
                total_matches: stats.total_matches || player.total_matches,
                win_rate: stats.win_rate || player.win_rate,
                kd_ratio: stats.avg_kd_ratio || player.kd_ratio,
                recent_form: stats.recent_form_string || player.recent_form,
                faceit_elo: stats.faceit_elo,
                avg_headshots_percent: stats.avg_headshots_percent,
                current_win_streak: stats.current_win_streak,
                longest_win_streak: stats.longest_win_streak,
                membership: stats.membership,
                country: stats.country,
                map_stats: stats.map_stats,
                recent_results: stats.recent_results
              };
            }
            return player;
          })
        }));
        setEnhancedTeams(enhanced);
      } catch (error) {
        console.error('Failed to fetch player stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchPlayerStats();
  }, [teams]);
  const team1 = enhancedTeams[0] || {
    name: 'Team 1',
    roster: []
  };
  const team2 = enhancedTeams[1] || {
    name: 'Team 2',
    roster: []
  };

  // If mobile, don't render this component (use mobile version instead)
  if (isMobile) {
    return null;
  }
  const handlePlayerClick = (player: Player, teamName: string) => {
    setSelectedPlayer(player);
    setSelectedTeamName(teamName);
    setIsModalOpen(true);
  };
  const getFormBadge = (form?: string) => {
    if (!form) return null;
    const wins = (form.match(/W/g) || []).length;
    const total = form.length;
    const winRate = wins / total * 100;
    return <Badge variant="outline" className={`text-xs ${winRate >= 60 ? 'text-green-400 border-green-400/30' : winRate >= 40 ? 'text-yellow-400 border-yellow-400/30' : 'text-red-400 border-red-400/30'}`}>
        {form}
      </Badge>;
  };
  const hasEnhancedStats = (roster?: Player[]) => {
    return roster?.some(player => player.total_matches && player.total_matches > 0) || false;
  };
  const renderTeamTable = (team: Team, teamIndex: number) => <div className={`p-4 rounded-lg ${teamIndex === 0 ? 'bg-blue-500/5' : 'bg-orange-500/5'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <img src={team.logo || team.avatar || '/placeholder.svg'} alt={team.name} className="w-8 h-8 object-contain" onError={e => {
        (e.target as HTMLImageElement).src = '/placeholder.svg';
      }} />
        <h3 className="text-xl font-bold text-white">{team.name}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
            <TableHeader>
              <TableRow className="border-theme-gray-medium hover:bg-theme-gray-medium/30">
                <TableHead className="text-gray-300 font-semibold">Player</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">Level</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">ELO</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">Matches</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">Win Rate</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">K/D</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">HS%</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center">Form</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.roster?.map((player, idx) => <TableRow key={`${player.player_id}-${idx}`} className="border-theme-gray-medium hover:bg-theme-gray-medium/30 cursor-pointer" onClick={() => handlePlayerClick(player, team.name)}>
                  <TableCell className="py-3">
                    <div className="flex items-center space-x-3">
                      <img src={player.avatar || '/placeholder.svg'} alt={player.nickname} className="w-8 h-8 rounded-full object-cover" onError={e => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }} />
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">{player.nickname}</span>
                        {player.membership === 'premium' && <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/30 w-fit">
                            PREMIUM
                          </Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {player.skill_level ? <Badge variant="outline" className={`text-xs ${getSkillLevelColor(player.skill_level)}`}>
                        {player.skill_level}
                      </Badge> : <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.faceit_elo ? <span className="text-purple-400 text-sm font-semibold">
                        {player.faceit_elo.toLocaleString()}
                      </span> : <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-white text-sm">
                      {player.total_matches || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {player.win_rate ? <span className="text-green-400 text-sm font-semibold">
                        {Math.round(player.win_rate)}%
                      </span> : <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.kd_ratio ? <span className="text-blue-400 text-sm font-semibold">
                        {player.kd_ratio.toFixed(2)}
                      </span> : <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {player.avg_headshots_percent ? <span className="text-yellow-400 text-sm font-semibold">
                        {Math.round(player.avg_headshots_percent)}%
                      </span> : <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {getFormBadge(player.recent_form) || <span className="text-gray-500 text-xs">-</span>}
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>;
  return <>
      <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)] overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <User className="h-6 w-6 mr-3" />
            Player Lineups
            {isLoadingStats && <Loader2 className="h-4 w-4 ml-2 animate-spin text-blue-400" />}
          </h2>

          {/* Enhanced Stats Indicator */}
          {hasEnhancedStats(team1.roster) || hasEnhancedStats(team2.roster)}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTeamTable(team1, 0)}
            {renderTeamTable(team2, 1)}
          </div>
        </div>
      </Card>

      <FaceitPlayerDetailsModal player={selectedPlayer} teamName={selectedTeamName} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>;
};