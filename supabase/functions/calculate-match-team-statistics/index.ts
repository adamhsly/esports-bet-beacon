import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const SYNC_STATE_ID = "pandascore_match_team_stats";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch sync state or create default
    let { data: syncState, error: syncError } = await supabaseClient
      .from("pandascore_sync_state")
      .select("*")
      .eq("id", SYNC_STATE_ID)
      .maybeSingle();

    if (syncError) {
      console.error("[ERROR] Fetching sync state:", syncError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sync state", details: syncError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!syncState) {
      // Create initial sync state row
      const { error: insertError } = await supabaseClient
        .from("pandascore_sync_state")
        .insert([{ id: SYNC_STATE_ID, last_match_row_id: 0, last_synced_at: new Date().toISOString() }]);
      if (insertError) {
        console.error("[ERROR] Creating initial sync state:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create initial sync state", details: insertError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      syncState = { id: SYNC_STATE_ID, last_match_row_id: 0 };
    }

    const BATCH_SIZE = 100; // Adjust batch size as needed
    const lastMatchRowId = syncState.last_match_row_id ?? 0;

    console.log(`[INFO] Starting batch from last_match_row_id = ${lastMatchRowId}`);

    // Fetch next batch of matches after lastMatchRowId
    const { data: matches, error: fetchError } = await supabaseClient
      .from("pandascore_matches")
      .select("id, match_id, start_time, esport_type, teams, status, winner_id, tournament_name, league_name")
      .gt("id", lastMatchRowId)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("[ERROR] Fetching matches failed:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch matches", details: fetchError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matches || matches.length === 0) {
      console.log("[INFO] No more matches to process");
      return new Response(
        JSON.stringify({ success: true, message: "No more matches to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let maxProcessedId = lastMatchRowId;
    let totalTeamsProcessed = 0;

    for (const match of matches) {
      maxProcessedId = Math.max(maxProcessedId, match.id);
      const matchId = match.match_id?.toString() || "";
      const esportType = match.esport_type;
      const matchStartTime = match.start_time;
      const teams = match.teams as any[];
      const matchStatus = match.status;

      if (!teams || teams.length === 0) {
        console.warn(`[WARN] No teams found for match id ${match.id} (match_id: ${matchId})`);
        continue;
      }

      for (const team of teams) {
        const teamId = team.opponent?.id?.toString();
        if (!teamId) {
          console.warn(`[WARN] Missing teamId in match id ${match.id}, skipping`);
          continue;
        }

        // Check if stats already processed for this team + match
        const { data: existingStat, error: existingError } = await supabaseClient
          .from("pandascore_match_team_stats")
          .select("id")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .maybeSingle();

        if (existingError) {
          console.error(`[ERROR] Checking existing stats for team ${teamId} match ${matchId}`, existingError);
          continue;
        }
        if (existingStat) {
          console.log(`[INFO] Skipping team ${teamId} for match ${matchId} (already processed)`);
          continue;
        }

        // Fetch historical matches for stats calculation
        const { data: historicalMatches, error: historyError } = await supabaseClient
          .from("pandascore_matches")
          .select("*")
          .eq("esport_type", esportType)
          .lt("start_time", matchStartTime)
          .eq("status", "finished")
          .order("start_time", { ascending: true });

        if (historyError || !historicalMatches) {
          console.error(`[ERROR] Fetching historical matches for team ${teamId}`, historyError);
          continue;
        }

        const teamMatches = historicalMatches.filter((m) => {
          return (m.teams ?? []).some((t) => t.opponent?.id?.toString() === teamId);
        });

        const stats = calculateTeamStatistics(teamId, teamMatches, matchStartTime);

        // Upsert stats
        const { error: insertError } = await supabaseClient
          .from("pandascore_match_team_stats")
          .upsert(
            {
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
              match_status: matchStatus,
            },
            { onConflict: ["match_id", "team_id"] }
          );

        if (insertError) {
          console.error(`[ERROR] Inserting stats for team ${teamId} match ${matchId}`, insertError);
          continue;
        } else {
          totalTeamsProcessed++;
          console.log(`[INFO] Processed stats for team ${teamId} in match ${matchId}`);
        }
      }
    }

    // Update sync state with new last_match_row_id and last_synced_at
    const { error: updateSyncError } = await supabaseClient
      .from("pandascore_sync_state")
      .update({
        last_match_row_id: maxProcessedId,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", SYNC_STATE_ID);

    if (updateSyncError) {
      console.error("[ERROR] Updating sync state failed:", updateSyncError);
      return new Response(
        JSON.stringify({ error: "Failed to update sync state", details: updateSyncError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INFO] Batch complete. Last processed match row id: ${maxProcessedId}, teams processed: ${totalTeamsProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        last_processed_match_row_id: maxProcessedId,
        teams_processed: totalTeamsProcessed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FATAL] Unhandled error:", error);
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

function getOpponentName(teamId: string, teams: any[]): string {
  const opponent = teams?.find((team) => {
    const id = team.opponent?.id?.toString();
    return id && id !== teamId;
  });

  return opponent?.opponent?.name || opponent?.name || "Unknown";
}
