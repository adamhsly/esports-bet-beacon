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
 * Calculate real team statistics from historical match data
 */
export async function calculateTeamStats(teamId: string | number, esportType: string): Promise<TeamStats> {
  try {
    console.log(`🏆 Calculating stats for team ID: ${teamId}, esport: ${esportType}`);
    
    // Convert team ID to string for consistent comparison
    const teamIdStr = String(teamId);
    
    // Fetch matches where this team participated (last 6 months for performance)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .gte('start_time', sixMonthsAgo.toISOString())
      .order('start_time', { ascending: false })
      .limit(50); // Limit for performance
    
    if (error) {
      console.error('❌ Error fetching team matches:', error);
      throw error;
    }

    if (!matches || matches.length === 0) {
      console.log(`⚠️ No matches found for team ${teamId} in ${esportType}`);
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    // Filter matches where this team participated and extract results
    const teamMatches: TeamMatchResult[] = [];
    const tournamentWins = new Set<string>(); // Track unique tournament wins

    for (const match of matches) {
      const teams = match.teams as any;
      const rawData = match.raw_data as any;
      
      if (!teams || !rawData) continue;

      let isTeamInMatch = false;
      let teamWon = false;
      let opponentName = '';

      // Check if our team is team1 or team2
      if (teams.team1?.id && String(teams.team1.id) === teamIdStr) {
        isTeamInMatch = true;
        opponentName = teams.team2?.name || 'Unknown';
        
        // Check if team1 won by looking at results or winner
        if (rawData.winner_id && String(rawData.winner_id) === teamIdStr) {
          teamWon = true;
        } else if (rawData.results && Array.isArray(rawData.results)) {
          const team1Result = rawData.results.find((r: any) => String(r.team_id) === teamIdStr);
          const team2Result = rawData.results.find((r: any) => String(r.team_id) !== teamIdStr);
          if (team1Result && team2Result && team1Result.score > team2Result.score) {
            teamWon = true;
          }
        }
      } else if (teams.team2?.id && String(teams.team2.id) === teamIdStr) {
        isTeamInMatch = true;
        opponentName = teams.team1?.name || 'Unknown';
        
        // Check if team2 won
        if (rawData.winner_id && String(rawData.winner_id) === teamIdStr) {
          teamWon = true;
        } else if (rawData.results && Array.isArray(rawData.results)) {
          const team2Result = rawData.results.find((r: any) => String(r.team_id) === teamIdStr);
          const team1Result = rawData.results.find((r: any) => String(r.team_id) !== teamIdStr);
          if (team2Result && team1Result && team2Result.score > team1Result.score) {
            teamWon = true;
          }
        }
      }

      if (isTeamInMatch) {
        teamMatches.push({
          match_id: match.match_id,
          result: teamWon ? 'win' : 'loss',
          tournament_name: match.tournament_name || 'Unknown Tournament',
          start_time: match.start_time,
          opponent_name: opponentName
        });

        // Track tournament wins
        if (teamWon && match.tournament_name) {
          tournamentWins.add(match.tournament_name);
        }
      }
    }

    console.log(`📊 Found ${teamMatches.length} matches for team ${teamId}`);

    if (teamMatches.length === 0) {
      return {
        winRate: 0,
        recentForm: '',
        tournamentWins: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0
      };
    }

    // Calculate statistics
    const wins = teamMatches.filter(m => m.result === 'win').length;
    const losses = teamMatches.filter(m => m.result === 'loss').length;
    const totalMatches = teamMatches.length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Generate recent form (last 5 matches)
    const recentMatches = teamMatches.slice(0, 5);
    const recentForm = recentMatches
      .map(match => match.result === 'win' ? 'W' : 'L')
      .join('-');

    const stats: TeamStats = {
      winRate,
      recentForm,
      tournamentWins: tournamentWins.size,
      totalMatches,
      wins,
      losses
    };

    console.log(`✅ Team ${teamId} stats calculated:`, stats);
    return stats;

  } catch (error) {
    console.error(`❌ Error calculating team stats for ${teamId}:`, error);
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
 * Get head-to-head record between two teams
 */
export async function getHeadToHeadRecord(team1Id: string | number, team2Id: string | number, esportType: string): Promise<{ team1Wins: number; team2Wins: number; totalMatches: number }> {
  try {
    console.log(`🥊 Getting head-to-head record: ${team1Id} vs ${team2Id} in ${esportType}`);
    
    const team1IdStr = String(team1Id);
    const team2IdStr = String(team2Id);
    
    // Fetch matches between these two teams (last 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('esport_type', esportType)
      .gte('start_time', twoYearsAgo.toISOString())
      .order('start_time', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching head-to-head matches:', error);
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    if (!matches) {
      return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
    }

    // Filter matches between these two teams
    let team1Wins = 0;
    let team2Wins = 0;
    let totalMatches = 0;

    for (const match of matches) {
      const teams = match.teams as any;
      const rawData = match.raw_data as any;
      
      if (!teams || !rawData) continue;

      // Check if this is a match between our two teams
      const hasTeam1 = teams.team1?.id && String(teams.team1.id) === team1IdStr;
      const hasTeam2 = teams.team2?.id && String(teams.team2.id) === team2IdStr;
      const hasTeam1AsTeam2 = teams.team2?.id && String(teams.team2.id) === team1IdStr;
      const hasTeam2AsTeam1 = teams.team1?.id && String(teams.team1.id) === team2IdStr;

      if ((hasTeam1 && hasTeam2) || (hasTeam1AsTeam2 && hasTeam2AsTeam1)) {
        totalMatches++;
        
        // Determine winner
        const winnerId = String(rawData.winner_id || '');
        if (winnerId === team1IdStr) {
          team1Wins++;
        } else if (winnerId === team2IdStr) {
          team2Wins++;
        }
      }
    }

    console.log(`🥊 Head-to-head: Team1(${team1Wins}) vs Team2(${team2Wins}) out of ${totalMatches} matches`);
    
    return { team1Wins, team2Wins, totalMatches };

  } catch (error) {
    console.error(`❌ Error getting head-to-head record:`, error);
    return { team1Wins: 0, team2Wins: 0, totalMatches: 0 };
  }
}