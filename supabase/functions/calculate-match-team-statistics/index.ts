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

const SYNC_ID = "pandascore_match_team_stats"; // single sync state row id
const BATCH_SIZE = 100; // adjust as needed

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load current sync state or create if missing
    let { data: syncState, error: syncError } = await supabaseClient
      .from("pandascore_sync_state")
      .select("*")
      .eq("id", SYNC_ID)
      .maybeSingle();

    if (syncError) {
      console.error("[ERROR] Fetching sync state:", syncError);
      return new Response(
        JSON.stringify({ error: "Failed to load sync state" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!syncState) {
      // Create initial sync state row
      const { error: insertError } = await supabaseClient
        .from("pandascore_sync_state")
        .insert({
          id: SYNC_ID,
          last_page: 0,
          last_synced_at: new Date().toISOString(),
          max_page: null,
          last_match_row_id: 0,
        });

      if (insertError) {
        console.error("[ERROR] Creating initial sync state:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create initial sync state" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      syncState = {
        id: SYNC_ID,
        last_page: 0,
        last_synced_at: new Date().toISOString(),
        max_page: null,
        last_match_row_id: 0,
      };
    }

    const lastMatchRowId = syncState.last_match_row_id ?? 0;

    console.log(`[INFO] Starting batch processing from row_id > ${lastMatchRowId}`);

    // Fetch batch of matches using row_id pagination
    const { data: matches, error: fetchError } = await supabaseClient
      .from("pandascore_matches")
      .select("row_id, match_id, start_time, esport_type, teams, status")
      .gt("row_id", lastMatchRowId)
      .order("row_id", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("[ERROR] Fetching matches failed:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch matches" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matches || matches.length === 0) {
      console.log("[INFO] No more matches to process");
      return new Response(
        JSON.stringify({ success: true, message: "No matches to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INFO] Fetched ${matches.length} matches`);

    const results: any[] = [];

    for (const match of matches) {
      const matchRowId = match.row_id;
      const matchId = match.match_id.toString();
      const esportType = match.esport_type;
      const matchStartTime = match.start_time;
      const teams = match.teams as any[];
      const matchStatus = match.status;

      if (!teams || teams.length === 0) {
        console.warn(`[WARN] No teams for match ${matchId}`);
        continue;
      }

      for (const team of teams) {
        const teamId = team.opponent?.id?.toString();
        if (!teamId) continue;

        // Skip if already processed
        const { data: existingStat } = await supabaseClient
          .from("pandascore_match_team_stats")
          .select("id")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .maybeSingle();

        if (existingStat) {
          console.log(`[INFO] Skipping team ${teamId} for match ${matchId} (already processed)`);
          continue;
        }

        // Pull match history for this team
        const { data: historicalMatches, error: historyError } = await supabaseClient
          .from("pandascore_matches")
          .select("*")
          .eq("esport_type", esportType)
          .lt("start_time", matchStartTime)
          .eq("status", "finished")
          .order("start_time", { ascending: true });

        if (historyError || !historicalMatches) {
          console.error(`[ERROR] Error fetching history for team ${teamId}`, historyError);
          continue;
        }

        const teamMatches = historicalMatches.filter((m) =>
          (m.teams ?? []).some((t) => t.opponent?.id?.toString() === teamId)
        );

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
          console.error(`[ERROR] Inserting stats for team ${teamId} in match ${matchId}`, insertError);
        } else {
          console.log(`[INFO] Processed stats for team ${teamId} in match ${matchId}`);
          results.push({ matchId, teamId, status: matchStatus });
        }
      }
    }

    // Update sync state with last processed row_id and timestamp
    const newLastMatchRowId = matches[matches.length - 1].row_id;
    const { error: updateError } = await supabaseClient
      .from("pandascore_sync_state")
      .update({
        last_match_row_id: newLastMatchRowId,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", SYNC_ID);

    if (updateError) {
      console.error("[ERROR] Updating sync state:", updateError);
    } else {
      console.log(`[INFO] Updated sync state last_match_row_id=${newLastMatchRowId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: results.length,
        lastMatchRowId: newLastMatchRowId,
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

function getOpponentName(teamId: string, teams: any[]): string | null {
  for (const team of teams) {
    if (team.opponent?.id?.toString() !== teamId) {
      return team.opponent?.name || null;
    }
  }
  return null;
}
