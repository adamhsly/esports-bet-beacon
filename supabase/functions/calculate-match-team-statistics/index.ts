import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 20;
const SYNC_STATE_ID = "pandascore_match_team_stats";

interface TeamStatsData {
  teamId: string;
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
  wins: number;
  losses: number;
  leaguePerformance: Record<string, any>;
  recentWinRate30d: number;
  last10MatchesDetail: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch or create sync state
    let { data: syncState, error: syncError } = await supabaseClient
      .from("pandascore_sync_state")
      .select("*")
      .eq("id", SYNC_STATE_ID)
      .maybeSingle();

    if (syncError) {
      console.error("Error fetching sync state:", syncError);
      return new Response(JSON.stringify({ error: "Error fetching sync state" }), { status: 500, headers: corsHeaders });
    }

    if (!syncState) {
      // Create initial sync state with last_match_row_id = 0
      const { error: insertSyncError } = await supabaseClient
        .from("pandascore_sync_state")
        .insert({
          id: SYNC_STATE_ID,
          last_match_row_id: 0,
          last_synced_at: new Date().toISOString(),
        });
      if (insertSyncError) {
        console.error("Error creating initial sync state:", insertSyncError);
        return new Response(JSON.stringify({ error: "Error creating initial sync state" }), { status: 500, headers: corsHeaders });
      }
      syncState = { last_match_row_id: 0 };
      console.log("Created initial sync state");
    }

    const lastRowId = syncState.last_match_row_id || 0;

    // Fetch next batch of matches with row_id > lastRowId
    const { data: matches, error: fetchError } = await supabaseClient
      .from("pandascore_matches")
      .select("row_id, match_id, start_time, esport_type, teams, status")
      .gt("row_id", lastRowId)
      .order("row_id", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Fetching matches failed:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch matches" }), { status: 500, headers: corsHeaders });
    }

    if (!matches || matches.length === 0) {
      console.log("No new matches to process");
      return new Response(JSON.stringify({ success: true, message: "No new matches to process" }), { headers: corsHeaders });
    }

    let maxProcessedRowId = lastRowId;
    const processedResults: any[] = [];

    for (const match of matches) {
      const matchRowId = match.row_id;
      const matchId = match.match_id.toString();
      const esportType = match.esport_type;
      const matchStartTime = match.start_time;
      const teams = match.teams as any[];
      const matchStatus = match.status;

      if (!teams || teams.length === 0) {
        console.warn(`No teams for match ${matchId}`);
        continue;
      }

      for (const team of teams) {
        const teamId = team.opponent?.id?.toString();
        if (!teamId) {
          console.warn(`No teamId for a team in match ${matchId}`);
          continue;
        }

        // Skip if already processed for this match+team
        const { data: existingStat, error: existingStatError } = await supabaseClient
          .from("pandascore_match_team_stats")
          .select("id")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .maybeSingle();

        if (existingStatError) {
          console.error(`Error checking existing stats for match ${matchId} team ${teamId}`, existingStatError);
          continue;
        }
        if (existingStat) {
          console.log(`Skipping team ${teamId} for match ${matchId} (already processed)`);
          continue;
        }

        // Fetch historical matches finished before this match start
        const { data: historicalMatches, error: historyError } = await supabaseClient
          .from("pandascore_matches")
          .select("*")
          .eq("esport_type", esportType)
          .lt("start_time", matchStartTime)
          .eq("status", "finished")
          .order("start_time", { ascending: true })
          .limit(100); // Limit historical to 100 matches to reduce CPU/time

        if (historyError || !historicalMatches) {
          console.error(`Error fetching history for team ${teamId}`, historyError);
          continue;
        }

        // Filter matches for this team
        const teamMatches = historicalMatches.filter(m => {
          return (m.teams ?? []).some(t => t.opponent?.id?.toString() === teamId);
        });

        const stats = calculateTeamStatistics(teamId, teamMatches, matchStartTime);

        // Upsert stats (without match_status)
        const { error: insertError } = await supabaseClient
          .from("pandascore_match_team_stats")
          .upsert({
            match_id: matchId,
            team_id: teamId,
            esport_type: esportType,
            win_rate: stats.winRate,
            recent_form: stats.recentForm,
            tournament_wins: stats.tournamentWins,
            total_matches: stats.totalMatches,
            wins: stats.wins,
            losses: stats.losses,
            league_performance: stats.leaguePerformance,
            recent_win_rate_30d: stats.recentWinRate30d,
            last_10_matches_detail: stats.last10MatchesDetail,
            calculated_at: new Date().toISOString(),
          }, { onConflict: ['match_id', 'team_id'] });

        if (insertError) {
          console.error(`Error inserting stats for team ${teamId} in match ${matchId}`, insertError);
        } else {
          console.log(`Processed stats for team ${teamId} in match ${matchId}`);
          processedResults.push({ matchId, teamId });
        }
      }

      if (matchRowId > maxProcessedRowId) maxProcessedRowId = matchRowId;
    }

    // Update sync state with max processed row_id and timestamp
    const { error: updateSyncError } = await supabaseClient
      .from("pandascore_sync_state")
      .update({
        last_match_row_id: maxProcessedRowId,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", SYNC_STATE_ID);

    if (updateSyncError) {
      console.error("Failed to update sync state:", updateSyncError);
      return new Response(JSON.stringify({ error: "Failed to update sync state" }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, lastProcessedRowId: maxProcessedRowId, processed: processedResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || error.toString() }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateTeamStatistics(teamId: string, matches: any[], matchStartTime: string): TeamStatsData {
  const totalMatches = matches.length;
  let wins = 0;
  let tournamentWins = 0;
  const leaguePerformance: Record<string, { wins: number; total: number }> = {};
  const thirtyDaysAgo = new Date(matchStartTime);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let recentMatches30d = 0;
  let recentWins30d = 0;
  const last10Matches = matches.slice(-10);
  const recentFormArray: string[] = [];
  const last10MatchesDetail: any[] = [];

  matches.forEach((match) => {
    const isWin = match.winner_id?.toString() === teamId;
    if (isWin) wins++;

    if (
      isWin &&
      (match.tournament_name?.toLowerCase().includes("championship") ||
        match.tournament_name?.toLowerCase().includes("major") ||
        match.league_name?.toLowerCase().includes("championship"))
    ) {
      tournamentWins++;
    }

    const leagueName = match.league_name || match.tournament_name || "Unknown";
    if (!leaguePerformance[leagueName]) {
      leaguePerformance[leagueName] = { wins: 0, total: 0 };
    }
    leaguePerformance[leagueName].total++;
    if (isWin) leaguePerformance[leagueName].wins++;

    const matchDate = new Date(match.start_time);
    if (matchDate >= thirtyDaysAgo) {
      recentMatches30d++;
      if (isWin) recentWins30d++;
    }
  });

  last10Matches.forEach((match) => {
    const isWin = match.winner_id?.toString() === teamId;
    recentFormArray.push(isWin ? "W" : "L");

    last10MatchesDetail.push({
      matchId: match.match_id,
      opponent: getOpponentName(teamId, match.teams),
      result: isWin ? "W" : "L",
      date: match.start_time,
      tournament: match.tournament_name || match.league_name,
    });
  });

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const recentWinRate30d = recentMatches30d > 0 ? Math.round((recentWins30d / recentMatches30d) * 100) : 0;
  const recentForm = recentFormArray.join("");

  return {
    teamId,
    winRate,
    recentForm,
    tournamentWins,
    totalMatches,
    wins,
    losses: totalMatches - wins,
    leaguePerformance,
    recentWinRate30d,
    last10MatchesDetail,
  };
}

function getOpponentName(teamId: string, teams: any[]): string | null {
  for (const team of teams) {
    if (team.opponent?.id?.toString() !== teamId) {
      return team.opponent?.name || null;
    }
  }
  return null;
}
