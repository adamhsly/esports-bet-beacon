// Fantasy Score Calculator - GitHub Actions Script
// This script calculates fantasy scores for all active rounds and stores detailed match breakdowns

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zcjzeafelunqxmxzznos.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Scoring configuration - must match all other scoring implementations
const BASE_POINTS = {
  matchWin: 10,
  mapWin: 3,
  cleanSweep: 5,
  tournamentWin: 20,
};
const AMATEUR_MULTIPLIER = 1.25;
const STAR_MULTIPLIER = 2;

async function main() {
  console.log('🚀 Starting fantasy score calculation...');
  console.log(`📅 Run time: ${new Date().toISOString()}`);

  try {
    // Fetch active rounds (open or closed status - not finished)
    const { data: rounds, error: roundsError } = await supabase
      .from('fantasy_rounds')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('start_date', { ascending: false });

    if (roundsError) {
      throw new Error(`Failed to fetch rounds: ${roundsError.message}`);
    }

    console.log(`📊 Found ${rounds?.length || 0} active rounds to process`);

    if (!rounds || rounds.length === 0) {
      console.log('✅ No active rounds to process');
      return;
    }

    for (const round of rounds) {
      console.log(`\n📌 Processing round: ${round.round_name || round.type} (${round.id})`);
      console.log(`   Period: ${round.start_date} to ${round.end_date}`);

      await processRound(round);
    }

    console.log('\n✅ Fantasy score calculation complete!');
  } catch (error) {
    console.error('❌ Error in fantasy score calculation:', error);
    process.exit(1);
  }
}

async function processRound(round) {
  // Fetch all picks for this round
  const { data: picks, error: picksError } = await supabase
    .from('fantasy_round_picks')
    .select('*')
    .eq('round_id', round.id);

  if (picksError) {
    console.error(`   ❌ Failed to fetch picks: ${picksError.message}`);
    return;
  }

  console.log(`   👥 Found ${picks?.length || 0} picks to process`);

  if (!picks || picks.length === 0) {
    return;
  }

  // Fetch star teams for this round (including change history for mid-round star swaps)
  const { data: starTeamsData, error: starTeamsError } = await supabase
    .from('fantasy_round_star_teams')
    .select('user_id, star_team_id, previous_star_team_id, star_changed_at, change_used')
    .eq('round_id', round.id);

  if (starTeamsError) {
    console.error(`   ⚠️ Failed to fetch star teams for round ${round.id}: ${starTeamsError.message}`);
  }

  // Map: user_id -> { currentStarTeamId, previousStarTeamId, starChangedAt, changeUsed }
  const starTeamMap = new Map();
  (starTeamsData || []).forEach(st => {
    starTeamMap.set(st.user_id, {
      currentStarTeamId: String(st.star_team_id),
      previousStarTeamId: st.previous_star_team_id ? String(st.previous_star_team_id) : null,
      starChangedAt: st.star_changed_at ? new Date(st.star_changed_at) : null,
      changeUsed: !!st.change_used,
    });
  });

  // Fetch team swaps for this round
  const { data: teamSwaps } = await supabase
    .from('fantasy_round_team_swaps')
    .select('*')
    .eq('round_id', round.id)
    .eq('swap_used', true);

  const swapMap = new Map();
  (teamSwaps || []).forEach(swap => {
    swapMap.set(swap.user_id, swap);
  });

  // Pre-fetch all matches for this round period
  console.log('   📥 Fetching matches...');
  const [proMatches, amateurMatches] = await Promise.all([
    fetchProMatches(round.start_date, round.end_date),
    fetchAmateurMatches(round.start_date, round.end_date),
  ]);

  console.log(`   📊 Found ${proMatches.length} pro matches, ${amateurMatches.length} amateur matches`);

  // Process each user's picks
  for (const pick of picks) {
    await processUserPick(round, pick, starTeamMap, swapMap, proMatches, amateurMatches);
  }
}

async function fetchProMatches(startDate, endDate) {
  const { data, error } = await supabase
    .from('pandascore_matches')
    .select('*')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .eq('status', 'finished');

  if (error) {
    console.error('   ❌ Failed to fetch pro matches:', error.message);
    return [];
  }
  return data || [];
}

async function fetchAmateurMatches(startDate, endDate) {
  const { data, error } = await supabase
    .from('faceit_matches')
    .select('*')
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .eq('is_finished', true);

  if (error) {
    console.error('   ❌ Failed to fetch amateur matches:', error.message);
    return [];
  }
  return data || [];
}

async function processUserPick(round, pick, starTeamMap, swapMap, proMatches, amateurMatches) {
  const userId = pick.user_id;
  const starTeamInfo = starTeamMap.get(userId); // Now contains { currentStarTeamId, previousStarTeamId, starChangedAt, changeUsed }
  const swap = swapMap.get(userId);

  // Parse team picks - handle various formats
  let teamPicks = [];
  try {
    if (typeof pick.team_picks === 'string') {
      teamPicks = JSON.parse(pick.team_picks);
    } else if (Array.isArray(pick.team_picks)) {
      teamPicks = pick.team_picks;
    }
  } catch (e) {
    console.error(`   ❌ Failed to parse team_picks for user ${userId}:`, e.message);
    return;
  }

  if (!teamPicks || teamPicks.length === 0) {
    return;
  }

  // Build list of teams to process, including swapped-out team if applicable
  const teamsToProcess = [...teamPicks];
  
  // If there was a swap, we need to also process the old (swapped-out) team
  // to maintain its score record with preserved points
  if (swap && swap.old_team_id) {
    const oldTeamInPicks = teamPicks.some(t => 
      String(t?.id ?? t?.team_id ?? '').trim() === swap.old_team_id
    );
    
    if (!oldTeamInPicks) {
      // Get old team info from existing scores or swap record
      const { data: oldScoreData } = await supabase
        .from('fantasy_round_scores')
        .select('team_name, team_type')
        .eq('round_id', round.id)
        .eq('user_id', userId)
        .eq('team_id', swap.old_team_id)
        .single();
      
      teamsToProcess.push({
        id: swap.old_team_id,
        name: oldScoreData?.team_name || 'Swapped Team',
        type: oldScoreData?.team_type || 'pro',
        _isSwappedOut: true, // Mark for special handling
      });
    }
  }

  let totalScore = 0;
  const allBreakdowns = [];
  const scoreUpdates = [];

  for (const rawTeam of teamsToProcess) {
    const teamId = String(rawTeam?.id ?? rawTeam?.team_id ?? '').trim();
    const teamName = String(rawTeam?.name ?? rawTeam?.team_name ?? '').trim();
    const teamType = String(rawTeam?.type ?? rawTeam?.team_type ?? 'pro').toLowerCase() === 'amateur' ? 'amateur' : 'pro';

    if (!teamId) continue;

    // Determine star status for this team (supports mid-round star team changes)
    const isCurrentStarTeam = starTeamInfo?.currentStarTeamId === teamId;
    const isPreviousStarTeam = starTeamInfo?.previousStarTeamId === teamId;
    const starChangedAt = starTeamInfo?.starChangedAt || null;
    
    // Check if this team was swapped out or in
    const wasSwappedOut = swap && swap.old_team_id === teamId;
    const wasSwappedIn = swap && swap.new_team_id === teamId;
    const swapTime = swap?.swapped_at ? new Date(swap.swapped_at) : null;

    // Calculate team's score and get match breakdowns
    // Pass star team info so we can apply multiplier based on timing
    const { score, breakdowns } = calculateTeamScore(
      teamId, teamName, teamType, round, proMatches, amateurMatches,
      isCurrentStarTeam, isPreviousStarTeam, starChangedAt,
      wasSwappedOut, wasSwappedIn, swapTime
    );

    // For swapped-out team, use preserved points
    let finalScore = score;
    if (wasSwappedOut) {
      finalScore = swap.points_at_swap || 0;
    }

    totalScore += finalScore;

    // Log star team info for debugging
    if (isCurrentStarTeam || isPreviousStarTeam) {
      console.log(`   ⭐ Team ${teamName}: ${breakdowns.length} matches, ${score} pts (star: current=${isCurrentStarTeam}, previous=${isPreviousStarTeam})`);
    }

    // Prepare breakdown records (only for matches that count)
    for (const breakdown of breakdowns) {
      allBreakdowns.push({
        round_id: round.id,
        user_id: userId,
        team_id: teamId,
        team_name: teamName,
        team_type: teamType,
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
        is_star_team: isCurrentStarTeam || isPreviousStarTeam,
        star_multiplier_applied: breakdown.star_multiplier_applied ?? false,
        amateur_bonus_applied: teamType === 'amateur',
      });
    }

    // Prepare score update
    const matchStats = calculateMatchStats(breakdowns);
    scoreUpdates.push({
      round_id: round.id,
      user_id: userId,
      team_id: teamId,
      team_name: teamName,
      team_type: teamType,
      current_score: finalScore,
      match_wins: matchStats.matchWins,
      map_wins: matchStats.mapWins,
      clean_sweeps: matchStats.cleanSweeps,
      tournaments_won: matchStats.tournamentsWon,
      matches_played: matchStats.matchesPlayed,
      last_updated: new Date().toISOString(),
    });
  }

  // Get the set of valid match IDs we just calculated
  const validMatchIds = new Set(allBreakdowns.map(b => String(b.match_id)));
  const teamIdsProcessed = [...new Set(allBreakdowns.map(b => b.team_id))];

  // Clean up stale breakdown entries for cancelled/rescheduled matches
  // For each team processed, delete breakdown entries with match IDs not in our valid set
  for (const teamId of teamIdsProcessed) {
    const validMatchIdsForTeam = allBreakdowns
      .filter(b => b.team_id === teamId)
      .map(b => String(b.match_id));
    
    if (validMatchIdsForTeam.length > 0) {
      // Get existing breakdown entries for this user/round/team
      const { data: existingBreakdowns } = await supabase
        .from('fantasy_team_match_breakdown')
        .select('match_id')
        .eq('round_id', round.id)
        .eq('user_id', userId)
        .eq('team_id', teamId);
      
      const staleMatchIds = (existingBreakdowns || [])
        .map(b => String(b.match_id))
        .filter(matchId => !validMatchIdsForTeam.includes(matchId));
      
      if (staleMatchIds.length > 0) {
        console.log(`   🗑️ Removing ${staleMatchIds.length} stale breakdown entries for team ${teamId}`);
        const { error: deleteError } = await supabase
          .from('fantasy_team_match_breakdown')
          .delete()
          .eq('round_id', round.id)
          .eq('user_id', userId)
          .eq('team_id', teamId)
          .in('match_id', staleMatchIds);
        
        if (deleteError) {
          console.error(`   ⚠️ Failed to delete stale breakdowns:`, deleteError.message);
        }
      }
    }
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
      console.error(`   ❌ Failed to upsert breakdowns for user ${userId}:`, breakdownError.message);
    }
  }

  // Recalculate current_score from the breakdown sum to ensure consistency
  // This ensures current_score always matches SUM(points_earned) from breakdowns
  for (const scoreUpdate of scoreUpdates) {
    const breakdownSum = allBreakdowns
      .filter(b => b.team_id === scoreUpdate.team_id)
      .reduce((sum, b) => sum + (b.points_earned || 0), 0);
    
    // Use breakdown sum for regular teams, or preserved points for swapped-out teams
    if (!scoreUpdate._preservedPoints) {
      scoreUpdate.current_score = breakdownSum;
    }
  }

  // Batch upsert scores
  if (scoreUpdates.length > 0) {
    const { error: scoreError } = await supabase
      .from('fantasy_round_scores')
      .upsert(scoreUpdates, {
        onConflict: 'round_id,user_id,team_id',
        ignoreDuplicates: false
      });

    if (scoreError) {
      console.error(`   ❌ Failed to upsert scores for user ${userId}:`, scoreError.message);
    }
  }

  // Update total score on pick
  const { error: updateError } = await supabase
    .from('fantasy_round_picks')
    .update({ total_score: totalScore, updated_at: new Date().toISOString() })
    .eq('id', pick.id);

  if (updateError) {
    console.error(`   ❌ Failed to update pick total for user ${userId}:`, updateError.message);
  }
}

function calculateTeamScore(teamId, teamName, teamType, round, proMatches, amateurMatches, isCurrentStarTeam, isPreviousStarTeam, starChangedAt, wasSwappedOut, wasSwappedIn, swapTime) {
  const breakdowns = [];
  let totalScore = 0;

  const amateurMult = teamType === 'amateur' ? AMATEUR_MULTIPLIER : 1;

  // Determine if star multiplier applies for a match based on timing
  // This matches the Edge Function logic exactly
  const shouldApplyStarMultiplier = (matchDate) => {
    // If this team is the current star team
    if (isCurrentStarTeam) {
      // If there was a change, only apply multiplier AFTER the change
      if (starChangedAt) {
        return matchDate >= starChangedAt;
      }
      // No change occurred, so this was always the star team - apply to all
      return true;
    }
    
    // If this team was the previous star team, apply multiplier only BEFORE the change
    if (isPreviousStarTeam && starChangedAt) {
      return matchDate < starChangedAt;
    }
    
    return false;
  };

  if (teamType === 'pro') {
    // Filter pro matches for this team
    const teamMatches = proMatches.filter(match => {
      const teams = match.teams;
      return teams?.some(t => t?.opponent?.id?.toString() === teamId);
    });

    for (const match of teamMatches) {
      const matchDate = new Date(match.start_time);
      
      // Check swap timing
      if (wasSwappedOut && swapTime && matchDate >= swapTime) continue;
      if (wasSwappedIn && swapTime && matchDate < swapTime) continue;

      // Determine star multiplier based on match timing
      const applyStarMult = shouldApplyStarMultiplier(matchDate);
      const starMult = applyStarMult ? STAR_MULTIPLIER : 1;

      const breakdown = processProMatch(match, teamId, starMult);
      if (breakdown) {
        breakdown.star_multiplier_applied = applyStarMult;
        breakdowns.push(breakdown);
        totalScore += breakdown.points_earned;
      }
    }
  } else {
    // Filter amateur matches for this team
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

      // Determine star multiplier based on match timing
      const applyStarMult = shouldApplyStarMultiplier(matchDate);
      const starMult = applyStarMult ? STAR_MULTIPLIER : 1;

      const breakdown = processAmateurMatch(match, teamId, starMult, amateurMult);
      if (breakdown) {
        breakdown.star_multiplier_applied = applyStarMult;
        breakdowns.push(breakdown);
        totalScore += breakdown.points_earned;
      }
    }
  }

  return { score: totalScore, breakdowns };
}

function processProMatch(match, teamId, starMult) {
  const teams = match.teams;
  const teamData = teams?.find(t => t?.opponent?.id?.toString() === teamId);
  const opponentData = teams?.find(t => t?.opponent?.id?.toString() !== teamId);

  // Determine result
  let result = 'draw';
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
    const teamResult = rawResults.find(r => r?.team_id?.toString() === teamId);
    const opponentResult = rawResults.find(r => r?.team_id?.toString() !== teamId);
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

  // Calculate points
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

function processAmateurMatch(match, teamId, starMult, amateurMult) {
  const f1Name = (match.faction1_name || '').toLowerCase();
  const searchId = teamId.toLowerCase();
  const isTeam1 = f1Name === searchId;
  const opponentName = isTeam1 ? match.faction2_name : match.faction1_name;

  // Get scores from faceit_data or raw_data
  const results = match.faceit_data?.results || match.raw_data?.results;
  const winnerId = results?.winner;

  // Determine result
  let result = 'draw';
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

function calculateMatchStats(breakdowns) {
  return {
    matchWins: breakdowns.filter(b => b.result === 'win').length,
    mapWins: breakdowns.reduce((sum, b) => sum + (b.map_wins || 0), 0),
    cleanSweeps: breakdowns.filter(b => b.is_clean_sweep).length,
    tournamentsWon: breakdowns.filter(b => b.is_tournament_win).length,
    matchesPlayed: breakdowns.length,
  };
}

// Run the main function
main();
