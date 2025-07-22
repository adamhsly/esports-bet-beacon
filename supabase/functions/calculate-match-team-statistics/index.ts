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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: any[] = [];
    const BATCH_SIZE = 100;
    let offset = 0;

    while (true) {
      const { data: matches, error: fetchError } = await supabaseClient
        .from("pandascore_matches")
        .select("match_id, start_time, esport_type, teams, status")
        .eq("status", "finished")
        .order("start_time", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        console.error("❌ Error fetching matches:", fetchError);
        break;
      }

      if (!matches || matches.length === 0) {
        console.log("✅ No more matches to process.");
        break;
      }

      console.log(`🔁 Processing batch: offset ${offset}, count ${matches.length}`);
      offset += BATCH_SIZE;

      for (const match of matches) {
        const matchId = match.match_id?.toString();
        const esportType = match.esport_type;
        const matchStartTime = match.start_time;
        const teams = match.teams as any[];

        if (!teams || teams.length === 0) {
          console.warn(`⚠️ No teams for match ${matchId}`);
          continue;
        }

        for (const team of teams) {
          const teamId = team.opponent?.id?.toString();
          if (!teamId) continue;

          const { data: existingStat } = await supabaseClient
            .from("pandascore_match_team_stats")
            .select("id")
            .eq("match_id", matchId)
            .eq("team_id", teamId)
            .maybeSingle();

          if (existingStat) {
            console.log(`⏭️ Skipping team ${teamId} for match ${matchId} (already processed)`);
            continue;
          }

          const { data: historicalMatches, error: historyError } = await supabaseClient
            .from("pandascore_matches")
            .select("*")
            .eq("esport_type", esportType)
            .lt("start_time", matchStartTime)
            .eq("status", "finished")
            .order("start_time", { ascending: true });

          if (historyError || !historicalMatches) {
            console.error(`❌ Error fetching history for team ${teamId}`, historyError);
            continue;
          }

          const teamMatches = historicalMatches.filter(m => {
            return (m.teams ?? []).some(t => {
              const id = t.opponent?.id?.toString();
              return id === teamId;
            });
          });

          const stats = calculateTeamStatistics(teamId, teamMatches, matchStartTime);

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
            console.error(`❌ Error inserting stats for team ${teamId} in match ${matchId}`, insertError);
          } else {
            console.log(`✅ Processed stats for team ${teamId} in match ${matchId}`);
            results.push({ matchId, teamId });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Unhandled error:", error);
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
