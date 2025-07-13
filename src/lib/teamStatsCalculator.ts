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
export async function calculateMatchSpecificTeamStats(teamId: string | number, esportType: string, matchId: string): Promise<TeamStats> {
  try {
    console.log(`Fetching match-specific team stats for team ${teamId}, match ${matchId}, esport ${esportType}`);
    
    const { data, error } = await supabase
      .from('pandascore_match_team_stats')
      .select('*')
      .eq('team_id', teamId.toString())
      .eq('match_id', matchId)
      .eq('esport_type', esportType)
      .single();

    if (error) {
      console.error('Error fetching match-specific team stats:', error);
      
      // If no stats exist, trigger calculation
      if (error.code === 'PGRST116') {
        console.log('No match-specific stats found, triggering calculation...');
        await triggerMatchStatsCalculation(matchId);
      }
      
      // Return default stats
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    if (!data) {
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    return {
      winRate: data.win_rate || 0,
      recentForm: data.recent_form || '',
      tournamentWins: data.tournament_wins || 0,
      totalMatches: data.total_matches || 0,
      wins: data.wins || 0,
      losses: data.losses || 0
    };
  } catch (error) {
    console.error('Error in calculateMatchSpecificTeamStats:', error);
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

async function triggerMatchStatsCalculation(matchId: string) {
  try {
    const response = await fetch(`https://zcjzeafelunqxmxzznos.supabase.co/functions/v1/calculate-match-team-statistics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchId })
    });
    
    if (!response.ok) {
      console.error('Failed to trigger match stats calculation');
    }
  } catch (error) {
    console.error('Error triggering match stats calculation:', error);
  }
}

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
 * Get head-to-head record between two teams from pre-calculated data
 */
export async function getMatchSpecificHeadToHeadRecord(team1Id: string | number, team2Id: string | number, esportType: string, matchId: string): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  try {
    console.log(`Fetching match-specific head-to-head record for teams ${team1Id} vs ${team2Id}, match ${matchId}`);
    
    // Get the match start time to filter historical data
    const { data: matchData } = await supabase
      .from('pandascore_matches')
      .select('start_time')
      .eq('match_id', matchId)
      .single();
    
    if (!matchData) {
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }
    
    // Use existing head-to-head table but filter by matches before this date
    const { data, error } = await supabase
      .from('panda_team_head_to_head')
      .select('*')
      .or(`and(team_a_id.eq.${team1Id},team_b_id.eq.${team2Id}),and(team_a_id.eq.${team2Id},team_b_id.eq.${team1Id})`)
      .lt('last_match_at', matchData.start_time)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching match-specific head-to-head:', error);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    if (!data) {
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Check if team order is correct or reversed
    const isReversed = data.team_a_id === team2Id.toString();
    
    return {
      team1Wins: isReversed ? data.team_b_wins : data.team_a_wins,
      team2Wins: isReversed ? data.team_a_wins : data.team_b_wins,
      totalMatches: data.total_matches
    };
  } catch (error) {
    console.error('Error in getMatchSpecificHeadToHeadRecord:', error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }
}

export async function getHeadToHeadRecord(team1Id: string | number, team2Id: string | number, esportType: string): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  try {
    console.log(`🥊 Fetching head-to-head record: ${team1Id} vs ${team2Id} in ${esportType}`);
    
    const team1IdStr = String(team1Id);
    const team2IdStr = String(team2Id);
    
    // Query the pre-calculated head-to-head table
    // Need to check both possible orderings since teams can be stored as (A,B) or (B,A)
    const { data: headToHeadData, error } = await supabase
      .from('panda_team_head_to_head')
      .select('*')
      .or(`and(team_a_id.eq.${team1IdStr},team_b_id.eq.${team2IdStr}),and(team_a_id.eq.${team2IdStr},team_b_id.eq.${team1IdStr})`)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error fetching head-to-head data:', error);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    if (!headToHeadData) {
      console.log(`⚠️ No head-to-head data found between ${team1Id} and ${team2Id}`);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Determine which team is which based on the stored order
    let team1Wins = 0;
    let team2Wins = 0;
    
    if (headToHeadData.team_a_id === team1IdStr) {
      // Team1 is stored as team_a, Team2 is stored as team_b
      team1Wins = headToHeadData.team_a_wins || 0;
      team2Wins = headToHeadData.team_b_wins || 0;
    } else {
      // Team1 is stored as team_b, Team2 is stored as team_a
      team1Wins = headToHeadData.team_b_wins || 0;
      team2Wins = headToHeadData.team_a_wins || 0;
    }

    const totalMatches = headToHeadData.total_matches || 0;

    console.log(`🥊 Head-to-head retrieved: Team1(${team1Wins}) vs Team2(${team2Wins}) out of ${totalMatches} matches`);
    
    return { 
      team1Wins, 
      team2Wins, 
      totalMatches
    };

  } catch (error) {
    console.error(`❌ Error fetching head-to-head record:`, error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }
}