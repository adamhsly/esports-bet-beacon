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
 * Get pre-calculated head-to-head record between two teams
 */
export async function getHeadToHeadRecord(team1Id: string | number, team2Id: string | number, esportType: string): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  try {
    console.log(`🥊 Getting pre-calculated head-to-head record: ${team1Id} vs ${team2Id} in ${esportType}`);
    
    const team1IdStr = String(team1Id);
    const team2IdStr = String(team2Id);
    
    // Order team IDs consistently for database lookup
    const orderedTeam1 = team1IdStr < team2IdStr ? team1IdStr : team2IdStr;
    const orderedTeam2 = team1IdStr < team2IdStr ? team2IdStr : team1IdStr;
    
    // Fetch pre-calculated head-to-head record from database
    const { data: h2hRecord, error } = await supabase
      .from('pandascore_head_to_head')
      .select('*')
      .eq('team1_id', orderedTeam1)
      .eq('team2_id', orderedTeam2)
      .eq('esport_type', esportType)
      .single();
    
    if (error) {
      console.error('❌ Error fetching head-to-head record:', error);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    if (!h2hRecord) {
      console.log(`⚠️ No pre-calculated head-to-head record found for ${team1Id} vs ${team2Id} in ${esportType}`);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Map the ordered results back to the original team order
    let team1Wins, team2Wins;
    if (team1IdStr < team2IdStr) {
      // Original order matches database order
      team1Wins = h2hRecord.team1_wins;
      team2Wins = h2hRecord.team2_wins;
    } else {
      // Original order is reversed from database order
      team1Wins = h2hRecord.team2_wins;
      team2Wins = h2hRecord.team1_wins;
    }

    console.log(`🥊 Pre-calculated head-to-head: Team1(${team1Wins}) vs Team2(${team2Wins}) out of ${h2hRecord.total_matches} matches`);
    
    return { 
      team1Wins: team1Wins || 0, 
      team2Wins: team2Wins || 0, 
      totalMatches: h2hRecord.total_matches || 0 
    };

  } catch (error) {
    console.error(`❌ Error getting head-to-head record:`, error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }
}