import { supabase } from '@/integrations/supabase/client';

interface TeamStats {
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
  wins: number;
  losses: number;
}

interface TeamMatchResult {
  match_id: string;
  result: 'win' | 'loss';
  tournament_name: string;
  start_time: string;
  opponent_name: string;
}

/**
 * Get pre-calculated team statistics from database
 */
export async function calculateTeamStats(teamId: string | number, esportType: string): Promise<TeamStats> {
  try {
    console.log(`🏆 Fetching pre-calculated stats for team ID: ${teamId}, esport: ${esportType}`);
    
    // Convert team ID to string for consistent comparison
    const teamIdStr = String(teamId);
    
    // Fetch pre-calculated stats from database
    const { data: teamStats, error } = await supabase
      .from('pandascore_team_stats')
      .select('*')
      .eq('team_id', teamIdStr)
      .eq('esport_type', esportType)
      .single();
    
    if (error) {
      console.error('❌ Error fetching team stats:', error);
      // Return default stats on error
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    if (!teamStats) {
      console.log(`⚠️ No pre-calculated stats found for team ${teamId} in ${esportType}`);
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    const stats: TeamStats = {
      winRate: teamStats.win_rate || 0,
      recentForm: teamStats.recent_form || '',
      tournamentWins: teamStats.tournament_wins || 0,
      totalMatches: teamStats.total_matches || 0,
      wins: teamStats.wins || 0,
      losses: teamStats.losses || 0
    };

    console.log(`✅ Team ${teamId} pre-calculated stats retrieved:`, stats);
    return stats;

  } catch (error) {
    console.error(`❌ Error fetching team stats for ${teamId}:`, error);
    // Return default stats on error
    return {
      winRate: 0,
      recentForm: '',
      tournamentWins: 0,
      totalMatches: 0,
      wins: 0,
      losses: 0
    };
  }
}

/**
 * Get head-to-head record between two teams by analyzing match history
 */
export async function getHeadToHeadRecord(team1Id: string | number, team2Id: string | number, esportType: string): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  try {
    console.log(`🥊 Calculating head-to-head record: ${team1Id} vs ${team2Id} in ${esportType}`);
    
    const team1IdStr = String(team1Id);
    const team2IdStr = String(team2Id);
    
    // Since pandascore_head_to_head table doesn't exist, 
    // calculate from match history in pandascore_matches
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .eq('status', 'finished');
    
    if (error) {
      console.error('❌ Error fetching matches for head-to-head:', error);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    if (!matches || matches.length === 0) {
      console.log(`⚠️ No finished matches found for ${esportType}`);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Filter matches that involve both teams
    const directMatches = matches.filter(match => {
      const teams = match.teams as any;
      if (!teams || !Array.isArray(teams) || teams.length < 2) return false;
      
      const teamIds = [teams[0]?.id, teams[1]?.id].filter(Boolean).map(String);
      return teamIds.includes(team1IdStr) && teamIds.includes(team2IdStr);
    });

    if (directMatches.length === 0) {
      console.log(`⚠️ No direct matches found between ${team1Id} and ${team2Id}`);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Count wins for each team
    let team1Wins = 0;
    let team2Wins = 0;

    directMatches.forEach(match => {
      if (match.winner_id === team1IdStr) {
        team1Wins++;
      } else if (match.winner_id === team2IdStr) {
        team2Wins++;
      }
    });

    console.log(`🥊 Head-to-head calculated: Team1(${team1Wins}) vs Team2(${team2Wins}) out of ${directMatches.length} matches`);
    
    return { 
      team1Wins, 
      team2Wins, 
      totalMatches: directMatches.length 
    };

  } catch (error) {
    console.error(`❌ Error calculating head-to-head record:`, error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }
}