import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scoring configuration - must match all other scoring implementations
const BASE_POINTS = {
  matchWin: 10,
  mapWin: 3,
  cleanSweep: 5,
  tournamentWin: 20,
};
const AMATEUR_MULTIPLIER = 1.25;
const STAR_MULTIPLIER = 2;

interface TeamPick {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
}

interface MatchBreakdown {
  match_id: string;
  match_date: string;
  opponent_name: string;
  opponent_logo: string | null;
  result: 'win' | 'loss' | 'draw';
  score: string;
  map_wins: number;
  map_losses: number;
  points_earned: number;
  is_clean_sweep: boolean;
  is_tournament_win: boolean;
  tournament_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🎯 Starting fantasy score calculation...');

    // Optional scoping via request body
    let roundFilter: string | undefined;
    let userFilter: string | undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object') {
        roundFilter = body.round_id ?? body.roundId ?? undefined;
        userFilter = body.user_id ?? body.userId ?? undefined;
        console.log(`🔍 Filters applied - Round: ${roundFilter || 'ALL'}, User: ${userFilter || 'ALL'}`);
      }
    } catch (_) {
      // Ignore bad JSON
    }

    // Get active fantasy rounds (optionally scoped) - include finished for recalculating
    let roundsQuery = supabase
      .from('fantasy_rounds')
      .select('*')
      .in('status', ['open', 'active', 'closed', 'finished']);
    if (roundFilter) roundsQuery = roundsQuery.eq('id', roundFilter);

    const { data: activeRounds, error: roundsError } = await roundsQuery;

    if (roundsError) throw roundsError;

    console.log(`📊 Found ${activeRounds?.length || 0} active rounds${roundFilter ? ` (filtered by ${roundFilter})` : ''}`);

    for (const round of activeRounds || []) {
      console.log(`🔄 Processing round ${round.id} (${round.type})`);
      console.log(`   Period: ${round.start_date} to ${round.end_date}`);

      // Pre-fetch all matches for this round period
      // Include 'finished' OR 'cancelled' matches that have a winner_id (completed but mis-labeled)
      const [proMatchesResult, amateurMatchesResult] = await Promise.all([
        supabase
          .from('pandascore_matches')
          .select('*')
          .gte('start_time', round.start_date)
          .lte('start_time', round.end_date)
          .or('status.eq.finished,and(status.eq.cancelled,winner_id.not.is.null)'),
        supabase
          .from('faceit_matches')
          .select('*')
          .gte('started_at', round.start_date)
          .lte('started_at', round.end_date)
          .eq('is_finished', true)
      ]);

      const proMatches = proMatchesResult.data || [];
      const amateurMatches = amateurMatchesResult.data || [];
      console.log(`   📊 Found ${proMatches.length} pro matches, ${amateurMatches.length} amateur matches`);

      // Get picks for this round (optionally filtered by user)
      let picksQuery = supabase
        .from('fantasy_round_picks')
        .select('*')
        .eq('round_id', round.id);
      if (userFilter) picksQuery = picksQuery.eq('user_id', userFilter);
      const { data: picks, error: picksError } = await picksQuery;

      if (picksError) throw picksError;

      console.log(`👥 Found ${picks?.length || 0} picks for round ${round.id}${userFilter ? ` (filtered by ${userFilter})` : ''}`);

      // Fetch all star teams for this round in one query
      const { data: starTeamsData, error: starTeamsError } = await supabase
        .from('fantasy_round_star_teams')
        .select('user_id, star_team_id')
        .eq('round_id', round.id);

      if (starTeamsError) {
        console.error(`⚠️ Error fetching star teams for round ${round.id}:`, starTeamsError);
      }

      // Create a map of user_id -> star_team_id for quick lookup
      const starTeamMap = new Map<string, string>();
      for (const st of starTeamsData || []) {
        starTeamMap.set(st.user_id, st.star_team_id);
      }
      console.log(`⭐ Found ${starTeamMap.size} star team selections for round ${round.id}`);

      // Fetch team swaps for this round
      const { data: teamSwaps } = await supabase
        .from('fantasy_round_team_swaps')
        .select('*')
        .eq('round_id', round.id)
        .eq('swap_used', true);

      const swapMap = new Map<string, any>();
      (teamSwaps || []).forEach(swap => {
        swapMap.set(swap.user_id, swap);
      });

      for (const pick of picks || []) {
        const teamPicks = Array.isArray(pick.team_picks) ? pick.team_picks : [];
        console.log(`🎮 Processing picks for user ${pick.user_id} with ${teamPicks.length} teams`);

        // Get this user's star team
        const userStarTeamId = starTeamMap.get(pick.user_id);
        const swap = swapMap.get(pick.user_id);

        // Parse team data
        const teams: TeamPick[] = teamPicks
          .map((rawTeam: any) => ({
            id: String(rawTeam?.id ?? rawTeam?.team_id ?? '').trim(),
            name: String(rawTeam?.name ?? rawTeam?.team_name ?? '').trim(),
            type: (String(rawTeam?.type ?? rawTeam?.team_type ?? 'pro').toLowerCase() === 'amateur' ? 'amateur' : 'pro') as 'pro' | 'amateur'
          }))
          .filter((team: TeamPick) => team.id && team.name);

        if (teams.length === 0) {
          console.warn('⏭️ No valid teams for user', pick.user_id);
          continue;
        }

        // Add swapped-out team if it's no longer in picks (to preserve its score record)
        if (swap && swap.old_team_id) {
          const oldTeamInPicks = teams.some(t => t.id === swap.old_team_id);
          
          if (!oldTeamInPicks) {
            // Get old team info from existing scores
            const { data: oldScoreData } = await supabase
              .from('fantasy_round_scores')
              .select('team_name, team_type')
              .eq('round_id', round.id)
              .eq('user_id', pick.user_id)
              .eq('team_id', swap.old_team_id)
              .maybeSingle();
            
            teams.push({
              id: swap.old_team_id,
              name: oldScoreData?.team_name || 'Swapped Team',
              type: (oldScoreData?.team_type || 'pro') as 'pro' | 'amateur',
            });
            
            console.log(`🔄 Added swapped-out team ${swap.old_team_id} for processing`);
          }
        }

        let totalScore = 0;
        const allBreakdowns: any[] = [];
        const scoreUpdates: any[] = [];

        for (const team of teams) {
          const isStarTeam = userStarTeamId === team.id;
          
          // Check if this team was swapped out or in
          const wasSwappedOut = swap && swap.old_team_id === team.id;
          const wasSwappedIn = swap && swap.new_team_id === team.id;
          const swapTime = swap?.swapped_at ? new Date(swap.swapped_at) : null;

          // Calculate team's score and get match breakdowns
          const { score, breakdowns } = calculateTeamScore(
            team.id, team.name, team.type, proMatches, amateurMatches,
            isStarTeam, wasSwappedOut, wasSwappedIn, swapTime
          );

          // For swapped-out team, use preserved points
          let finalScore = score;
          if (wasSwappedOut) {
            finalScore = swap.points_at_swap || 0;
          }

          totalScore += finalScore;

          if (isStarTeam) {
            console.log(`⭐ Team ${team.name}: ${breakdowns.length} matches, ${finalScore} pts (star team)`);
          }

          // Prepare breakdown records
          for (const breakdown of breakdowns) {
            allBreakdowns.push({
              round_id: round.id,
              user_id: pick.user_id,
              team_id: team.id,
              team_name: team.name,
              team_type: team.type,
              match_id: breakdown.match_id,
              match_date: breakdown.match_date,
              opponent_name: breakdown.opponent_name,
              opponent_logo: breakdown.opponent_logo,
              result: breakdown.result,
              score: breakdown.score,
              map_wins: breakdown.map_wins,
              map_losses: breakdown.map_losses,
              points_earned: breakdown.points_earned,
              is_clean_sweep: breakdown.is_clean_sweep,
              is_tournament_win: breakdown.is_tournament_win,
              tournament_name: breakdown.tournament_name,
              is_star_team: isStarTeam,
              star_multiplier_applied: isStarTeam,
              amateur_bonus_applied: team.type === 'amateur',
            });
          }

          // Prepare score update
          const matchStats = calculateMatchStats(breakdowns);
          scoreUpdates.push({
            round_id: round.id,
            user_id: pick.user_id,
            team_id: team.id,
            team_name: team.name,
            team_type: team.type,
            current_score: finalScore,
            match_wins: matchStats.matchWins,
            map_wins: matchStats.mapWins,
            clean_sweeps: matchStats.cleanSweeps,
            tournaments_won: matchStats.tournamentsWon,
            matches_played: matchStats.matchesPlayed,
            last_updated: new Date().toISOString(),
          });
        }

        // Batch upsert breakdowns
        if (allBreakdowns.length > 0) {
          const { error: breakdownError } = await supabase
            .from('fantasy_team_match_breakdown')
            .upsert(allBreakdowns, { 
              onConflict: 'round_id,user_id,team_id,match_id',
              ignoreDuplicates: false 
            });

          if (breakdownError) {
            console.error(`❌ Failed to upsert breakdowns for user ${pick.user_id}:`, breakdownError.message);
          }
        }

        // Batch upsert scores
        if (scoreUpdates.length > 0) {
          const { error: upsertError } = await supabase
            .from('fantasy_round_scores')
            .upsert(scoreUpdates, {
              onConflict: 'round_id,user_id,team_id'
            });

          if (upsertError) {
            console.error(`❌ Error upserting scores for user ${pick.user_id}:`, upsertError);
          } else {
            console.log(`✅ Updated ${scoreUpdates.length} team scores for user ${pick.user_id}`);
          }
        }

        // Update total score for the pick
        const { error: updateError } = await supabase
          .from('fantasy_round_picks')
          .update({ total_score: totalScore, updated_at: new Date().toISOString() })
          .eq('id', pick.id);

        if (updateError) {
          console.error(`❌ Failed to update pick total for user ${pick.user_id}:`, updateError.message);
        } else {
          console.log(`📈 Updated total score for user ${pick.user_id}: ${totalScore} points`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fantasy scores calculated successfully',
        rounds_processed: activeRounds?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error calculating fantasy scores:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to calculate fantasy scores', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function calculateTeamScore(
  teamId: string,
  teamName: string,
  teamType: 'pro' | 'amateur',
  proMatches: any[],
  amateurMatches: any[],
  isStarTeam: boolean,
  wasSwappedOut: boolean,
  wasSwappedIn: boolean,
  swapTime: Date | null
): { score: number; breakdowns: MatchBreakdown[] } {
  const breakdowns: MatchBreakdown[] = [];
  let totalScore = 0;

  const starMult = isStarTeam ? STAR_MULTIPLIER : 1;
  const amateurMult = teamType === 'amateur' ? AMATEUR_MULTIPLIER : 1;

  if (teamType === 'pro') {
    // Filter pro matches for this team
    const teamMatches = proMatches.filter(match => {
      const teams = match.teams;
      return teams?.some((t: any) => t?.opponent?.id?.toString() === teamId);
    });

    for (const match of teamMatches) {
      const matchDate = new Date(match.start_time);
      
      // Check swap timing
      if (wasSwappedOut && swapTime && matchDate >= swapTime) continue;
      if (wasSwappedIn && swapTime && matchDate < swapTime) continue;

      const breakdown = processProMatch(match, teamId, starMult);
      if (breakdown) {
        breakdowns.push(breakdown);
        totalScore += breakdown.points_earned;
      }
    }
  } else {
    // Filter amateur matches for this team - match by team NAME (ID is the name for amateur teams)
    const teamNameLower = teamId.toLowerCase();
    const teamMatches = amateurMatches.filter(match => {
      const f1 = (match.faction1_name || '').toLowerCase();
      const f2 = (match.faction2_name || '').toLowerCase();
      return f1 === teamNameLower || f2 === teamNameLower;
    });

    for (const match of teamMatches) {
      const matchDate = new Date(match.started_at);
      
      // Check swap timing
      if (wasSwappedOut && swapTime && matchDate >= swapTime) continue;
      if (wasSwappedIn && swapTime && matchDate < swapTime) continue;

      const breakdown = processAmateurMatch(match, teamId, starMult, amateurMult);
      if (breakdown) {
        breakdowns.push(breakdown);
        totalScore += breakdown.points_earned;
      }
    }
  }

  return { score: totalScore, breakdowns };
}

function processProMatch(match: any, teamId: string, starMult: number): MatchBreakdown | null {
  const teams = match.teams;
  const teamData = teams?.find((t: any) => t?.opponent?.id?.toString() === teamId);
  const opponentData = teams?.find((t: any) => t?.opponent?.id?.toString() !== teamId);

  // Determine result
  let result: 'win' | 'loss' | 'draw' = 'draw';
  const winnerId = match.winner_id?.toString();
  if (winnerId === teamId) {
    result = 'win';
  } else if (winnerId && winnerId !== teamId) {
    result = 'loss';
  }

  // Extract scores from raw_data.results
  const rawResults = match.raw_data?.results;
  let teamScore = 0;
  let opponentScore = 0;
  
  if (Array.isArray(rawResults)) {
    const teamResult = rawResults.find((r: any) => r?.team_id?.toString() === teamId);
    const opponentResult = rawResults.find((r: any) => r?.team_id?.toString() !== teamId);
    teamScore = teamResult?.score || 0;
    opponentScore = opponentResult?.score || 0;
  }

  // Check for clean sweep - exclude BO1
  const numberOfGames = match.number_of_games || 1;
  const isCleanSweep = result === 'win' && opponentScore === 0 && teamScore >= 2 && numberOfGames >= 2;

  // Check for tournament win
  const tournamentNameLower = (match.tournament_name || '').toLowerCase();
  const leagueNameLower = (match.league_name || '').toLowerCase();
  const isTournamentWin = result === 'win' && (
    tournamentNameLower.includes('championship') ||
    tournamentNameLower.includes('final') ||
    tournamentNameLower.includes('cup') ||
    tournamentNameLower.includes('major') ||
    leagueNameLower.includes('championship') ||
    leagueNameLower.includes('major') ||
    leagueNameLower.includes('final')
  );

  // Calculate points - map wins count for ALL matches, not just wins
  let points = teamScore * BASE_POINTS.mapWin;
  if (result === 'win') points += BASE_POINTS.matchWin;
  if (isCleanSweep) points += BASE_POINTS.cleanSweep;
  if (isTournamentWin) points += BASE_POINTS.tournamentWin;
  points = Math.round(points * starMult);

  return {
    match_id: match.match_id,
    match_date: match.start_time,
    opponent_name: opponentData?.opponent?.name || 'Unknown',
    opponent_logo: opponentData?.opponent?.image_url || null,
    result,
    score: `${teamScore}-${opponentScore}`,
    map_wins: teamScore,
    map_losses: opponentScore,
    points_earned: points,
    is_clean_sweep: isCleanSweep,
    is_tournament_win: isTournamentWin,
    tournament_name: match.tournament_name || match.league_name || '',
  };
}

function processAmateurMatch(match: any, teamId: string, starMult: number, amateurMult: number): MatchBreakdown | null {
  const f1Name = (match.faction1_name || '').toLowerCase();
  const searchId = teamId.toLowerCase();
  const isTeam1 = f1Name === searchId;
  const opponentName = isTeam1 ? match.faction2_name : match.faction1_name;

  // Get scores from faceit_data or raw_data
  const results = match.faceit_data?.results || match.raw_data?.results;
  const winnerId = results?.winner;

  // Determine result
  let result: 'win' | 'loss' | 'draw' = 'draw';
  if (winnerId === 'faction1' && isTeam1) {
    result = 'win';
  } else if (winnerId === 'faction2' && !isTeam1) {
    result = 'win';
  } else if (winnerId) {
    result = 'loss';
  }

  // Get scores
  const teamScore = isTeam1
    ? (results?.score?.faction1 || 0)
    : (results?.score?.faction2 || 0);
  const opponentScore = isTeam1
    ? (results?.score?.faction2 || 0)
    : (results?.score?.faction1 || 0);

  // Check for clean sweep
  const isCleanSweep = result === 'win' && opponentScore === 0 && teamScore >= 2;

  // Check for tournament win
  const isTournamentWin = result === 'win' && match.competition_type === 'championship';

  // Calculate points with amateur multiplier applied to total
  let points = teamScore * BASE_POINTS.mapWin;
  if (result === 'win') points += BASE_POINTS.matchWin;
  if (isCleanSweep) points += BASE_POINTS.cleanSweep;
  if (isTournamentWin) points += BASE_POINTS.tournamentWin;
  points = Math.floor(points * amateurMult);
  points = Math.round(points * starMult);

  return {
    match_id: match.match_id,
    match_date: match.started_at,
    opponent_name: opponentName || 'Unknown',
    opponent_logo: null,
    result,
    score: `${teamScore}-${opponentScore}`,
    map_wins: teamScore,
    map_losses: opponentScore,
    points_earned: points,
    is_clean_sweep: isCleanSweep,
    is_tournament_win: isTournamentWin,
    tournament_name: match.competition_name || '',
  };
}

function calculateMatchStats(breakdowns: MatchBreakdown[]) {
  return {
    matchWins: breakdowns.filter(b => b.result === 'win').length,
    mapWins: breakdowns.reduce((sum, b) => sum + (b.map_wins || 0), 0),
    cleanSweeps: breakdowns.filter(b => b.is_clean_sweep).length,
    tournamentsWon: breakdowns.filter(b => b.is_tournament_win).length,
    matchesPlayed: breakdowns.length,
  };
}
