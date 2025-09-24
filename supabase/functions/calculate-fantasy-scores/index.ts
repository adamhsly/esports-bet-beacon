import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamScore {
  team_id: string;
  team_name: string;
  team_type: 'pro' | 'amateur';
  match_wins: number;
  map_wins: number;
  tournaments_won: number;
  clean_sweeps: number;
  matches_played: number;
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

    // Get active fantasy rounds (optionally scoped)
    let roundsQuery = supabase
      .from('fantasy_rounds')
      .select('*')
      .in('status', ['open', 'active']);
    if (roundFilter) roundsQuery = roundsQuery.eq('id', roundFilter);

    const { data: activeRounds, error: roundsError } = await roundsQuery;

    if (roundsError) throw roundsError;

    console.log(`📊 Found ${activeRounds?.length || 0} active rounds${roundFilter ? ` (filtered by ${roundFilter})` : ''}`);

    for (const round of activeRounds || []) {
      console.log(`🔄 Processing round ${round.id} (${round.type})`);

      // Get picks for this round (optionally filtered by user)
      let picksQuery = supabase
        .from('fantasy_round_picks')
        .select('*')
        .eq('round_id', round.id);
      if (userFilter) picksQuery = picksQuery.eq('user_id', userFilter);
      const { data: picks, error: picksError } = await picksQuery;

      if (picksError) throw picksError;

      console.log(`👥 Found ${picks?.length || 0} picks for round ${round.id}${userFilter ? ` (filtered by ${userFilter})` : ''}`);

      for (const pick of picks || []) {
        const teamPicks = Array.isArray(pick.team_picks) ? pick.team_picks : [];
        console.log(`🎮 Processing picks for user ${pick.user_id} with ${teamPicks.length} teams`);

        for (const rawTeam of teamPicks) {
          const teamId = String(rawTeam?.id ?? rawTeam?.team_id ?? '').trim();
          const teamName = String(rawTeam?.name ?? rawTeam?.team_name ?? '').trim();
          let teamType = String(rawTeam?.type ?? rawTeam?.team_type ?? 'pro').toLowerCase();
          teamType = teamType === 'amateur' ? 'amateur' : 'pro';

          if (!teamId || !teamName) {
            console.warn('⏭️ Skipping invalid team pick (missing id/name)', { roundId: round.id, userId: pick.user_id, rawTeam });
            continue;
          }

          console.log(`⚡ Calculating scores for team ${teamName} (${teamId})`);

          // Calculate scores for this team
          const teamScore = await calculateTeamScore(supabase, teamId, teamName, teamType, round.start_date, round.end_date);

          // Upsert the score record
          const { error: upsertError } = await supabase
            .from('fantasy_round_scores')
            .upsert({
              round_id: round.id,
              user_id: pick.user_id,
              team_id: teamId,
              team_name: teamName,
              team_type: teamType,
              current_score: calculateTotalScore(teamScore),
              match_wins: teamScore.match_wins,
              map_wins: teamScore.map_wins,
              tournaments_won: teamScore.tournaments_won,
              clean_sweeps: teamScore.clean_sweeps,
              matches_played: teamScore.matches_played,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'round_id,user_id,team_id'
            });

          if (upsertError) {
            console.error(`❌ Error upserting score for team ${teamId}:`, upsertError);
          } else {
            console.log(`✅ Updated scores for team ${teamName}: ${teamScore.match_wins} wins, ${teamScore.matches_played} matches`);
          }
        }

        // Update total score for the pick
        const { data: userScores, error: scoresError } = await supabase
          .from('fantasy_round_scores')
          .select('current_score')
          .eq('round_id', round.id)
          .eq('user_id', pick.user_id);

        if (!scoresError && userScores) {
          const totalScore = userScores.reduce((sum, score) => sum + (score.current_score || 0), 0);
          
          await supabase
            .from('fantasy_round_picks')
            .update({ total_score: totalScore })
            .eq('id', pick.id);

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

async function calculateTeamScore(
  supabase: any,
  teamId: string,
  teamName: string,
  teamType: string,
  startDate: string,
  endDate: string
): Promise<TeamScore> {
  console.log(`🔍 Calculating scores for team ${teamName} between ${startDate} and ${endDate}`);

  let totalMatchWins = 0;
  let totalMapWins = 0;
  let totalTournamentWins = 0;
  let totalCleanSweeps = 0;
  let totalMatchesPlayed = 0;

  // Query PandaScore matches
  const { data: pandaMatches, error: pandaError } = await supabase
    .from('pandascore_matches')
    .select('match_id, teams, winner_id, raw_data, number_of_games, status, start_time')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .eq('status', 'finished');

  if (!pandaError && pandaMatches) {
    console.log(`🐼 Found ${pandaMatches.length} finished PandaScore matches in timeframe`);
    
    for (const match of pandaMatches) {
      const teams = Array.isArray(match.teams) ? match.teams : [];
      const teamInMatch = teams.find((t: any) => 
        String(t.opponent?.id) === teamId || String(t.opponent?.opponent?.id) === teamId
      );

      if (teamInMatch) {
        totalMatchesPlayed++;
        console.log(`🎯 Team ${teamName} played in match ${match.match_id}`);

        // Check if team won the match
        if (String(match.winner_id) === teamId) {
          totalMatchWins++;
          console.log(`🏆 Team ${teamName} won match ${match.match_id}`);

          // Check for clean sweep (best of 3 won 2-0, best of 5 won 3-0)
          const games = match.raw_data?.games || [];
          if (games.length > 0) {
            const teamWins = games.filter((game: any) => String(game.winner?.id) === teamId).length;
            totalMapWins += teamWins;
            
            if ((match.number_of_games === 3 && teamWins === 2 && games.length === 2) ||
                (match.number_of_games === 5 && teamWins === 3 && games.length === 3)) {
              totalCleanSweeps++;
              console.log(`🧹 Team ${teamName} achieved clean sweep in match ${match.match_id}`);
            }
          }
        } else {
          // Count map wins even in losing matches
          const games = match.raw_data?.games || [];
          const teamWins = games.filter((game: any) => String(game.winner?.id) === teamId).length;
          totalMapWins += teamWins;
        }
      }
    }
  }

  // Query Faceit matches
  const { data: faceitMatches, error: faceitError } = await supabase
    .from('faceit_matches')
    .select('match_id, teams, status, started_at, faceit_data')
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .in('status', ['finished', 'FINISHED']);

  if (!faceitError && faceitMatches) {
    console.log(`🎮 Found ${faceitMatches.length} finished Faceit matches in timeframe`);
    
    for (const match of faceitMatches) {
      const teams = match.teams || {};
      
      // FACEIT uses faction1/faction2 structure, normalize team names for matching
      const faction1Name = teams.faction1?.name ? String(teams.faction1.name).toLowerCase().trim() : '';
      const faction2Name = teams.faction2?.name ? String(teams.faction2.name).toLowerCase().trim() : '';
      const normalizedTeamId = teamId.toLowerCase().trim();
      const normalizedTeamName = teamName.toLowerCase().trim();
      
      console.log(`🔍 Checking FACEIT match ${match.match_id}: ${faction1Name} vs ${faction2Name} against ${normalizedTeamName} (${normalizedTeamId})`);
      
      let teamFaction = null;
      if (faction1Name === normalizedTeamId || faction1Name === normalizedTeamName) {
        teamFaction = 'faction1';
      } else if (faction2Name === normalizedTeamId || faction2Name === normalizedTeamName) {
        teamFaction = 'faction2';
      }

      if (teamFaction) {
        totalMatchesPlayed++;
        console.log(`🎯 Team ${teamName} played as ${teamFaction} in Faceit match ${match.match_id}`);

        // Check results from faceit_data - handle object structure
        const faceitData = match.faceit_data;
        if (faceitData && faceitData.results) {
          const winner = faceitData.results.winner;
          console.log(`🏁 Match winner: ${winner}, team faction: ${teamFaction}`);
          
          if (winner === teamFaction) {
            totalMatchWins++;
            console.log(`🏆 Team ${teamName} won Faceit match ${match.match_id}`);
            
            // Calculate map wins from score
            const score = faceitData.results.score;
            if (score && score[teamFaction]) {
              const teamMapWins = parseInt(score[teamFaction]) || 0;
              totalMapWins += teamMapWins;
              console.log(`🗺️ Team ${teamName} won ${teamMapWins} maps in match ${match.match_id}`);
              
              // Check for clean sweep (won all maps without opponent winning any)
              const opponentFaction = teamFaction === 'faction1' ? 'faction2' : 'faction1';
              const opponentMapWins = parseInt(score[opponentFaction]) || 0;
              if (opponentMapWins === 0 && teamMapWins > 0) {
                totalCleanSweeps++;
                console.log(`🧹 Team ${teamName} achieved clean sweep in match ${match.match_id}`);
              }
            }
          } else {
            // Count map wins even in losing matches
            const score = faceitData.results.score;
            if (score && score[teamFaction]) {
              const teamMapWins = parseInt(score[teamFaction]) || 0;
              totalMapWins += teamMapWins;
              console.log(`🗺️ Team ${teamName} won ${teamMapWins} maps in losing match ${match.match_id}`);
            }
          }
        } else {
          console.warn(`⚠️ No faceit_data.results found for match ${match.match_id}`);
        }
      }
    }
  }

  const finalScore: TeamScore = {
    team_id: teamId,
    team_name: teamName,
    team_type: teamType as 'pro' | 'amateur',
    match_wins: totalMatchWins,
    map_wins: totalMapWins,
    tournaments_won: totalTournamentWins, // TODO: Implement tournament win detection
    clean_sweeps: totalCleanSweeps,
    matches_played: totalMatchesPlayed
  };

  console.log(`📊 Final scores for ${teamName}:`, finalScore);
  return finalScore;
}

function calculateTotalScore(teamScore: TeamScore): number {
  // Scoring system: 
  // - Match win: 10 points
  // - Map win: 3 points  
  // - Clean sweep bonus: 5 points
  // - Tournament win: 25 points
  // - Amateur team bonus: +25% to total score

  let score = 0;
  score += teamScore.match_wins * 10;
  score += teamScore.map_wins * 3;
  score += teamScore.clean_sweeps * 5;
  score += teamScore.tournaments_won * 25;

  // Apply amateur bonus
  if (teamScore.team_type === 'amateur') {
    score = Math.floor(score * 1.25);
  }

  return score;
}