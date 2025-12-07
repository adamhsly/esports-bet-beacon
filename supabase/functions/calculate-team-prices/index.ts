import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const {
      round_id,
      PRO_MULTIPLIER = 1.2,
      AMATEUR_MULTIPLIER = 0.9,
      MIN_PRICE = 5,
      MAX_PRICE = 20,
      ABANDON_PENALTY_MULTIPLIER = 5,
    } = body || {};

    let rounds: Array<{ id: string; type: string; start_date: string; end_date: string; is_private?: boolean }>;
    if (round_id) {
      const { data, error } = await supabase
        .from("fantasy_rounds")
        .select("id, type, start_date, end_date, is_private")
        .eq("id", round_id)
        .maybeSingle();
      if (error) throw error;
      rounds = data ? [data] as any : [];
    } else {
      const { data, error } = await supabase
        .from("fantasy_rounds")
        .select("id, type, start_date, end_date, is_private")
        .in("status", ["open", "active"]);
      if (error) throw error;
      rounds = (data || []) as any;
    }

    const results: any[] = [];
    const now = new Date();

    for (const r of rounds) {
      console.log("=== Processing round ===", r);

      const roundStart = new Date(r.start_date);
      const roundEnd = new Date(r.end_date);
      const isScheduledRound = roundStart > now;

      // 1) PRO TEAMS - Using match_date for much faster lookups
      let proStartDate: string;
      let proEndDate: string;

      if (isScheduledRound) {
        // For scheduled/future rounds: use upcoming matches within the round window
        // But also look at recent matches (last 30 days) to find active teams and their stats
        proStartDate = roundStart.toISOString().split('T')[0];
        proEndDate = roundEnd.toISOString().split('T')[0];
        console.log("Scheduled round - checking for upcoming matches in round window");
      } else {
        proStartDate = roundStart.toISOString().split('T')[0];
        proEndDate = roundEnd.toISOString().split('T')[0];
      }

      // First, try to get matches within the round's date range
      const { data: pandaMatches, error: pandaErr } = await supabase
        .from("pandascore_matches")
        .select("teams, esport_type, start_time")
        .gte("match_date", proStartDate)
        .lte("match_date", proEndDate)
        .not("teams", "is", null);
      if (pandaErr) throw pandaErr;
      console.log("pandaMatches in round window:", pandaMatches?.length || 0);

      const proTeamMap = new Map<string, { id: string; name: string; esport_type?: string; match_volume: number }>();
      (pandaMatches || []).forEach((m: any) => {
        if (Array.isArray(m.teams)) {
          m.teams.forEach((t: any) => {
            if (t?.type === "Team" && t?.opponent?.id) {
              const id = String(t.opponent.id);
              const name = t.opponent.name || t.opponent.slug || "Unknown Team";
              const existing = proTeamMap.get(id);
              if (existing) existing.match_volume += 1;
              else proTeamMap.set(id, { id, name, esport_type: m.esport_type, match_volume: 1 });
            }
          });
        }
      });

      // For scheduled rounds with few/no matches in window, also check recent history (last 60 days)
      // to populate with active teams that are likely to have matches scheduled
      if (isScheduledRound && proTeamMap.size < 50) {
        console.log("Scheduled round has few teams, checking recent 60-day history for active teams");
        const lookbackStart = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const lookbackEnd = now.toISOString().split('T')[0];

        const { data: recentMatches, error: recentErr } = await supabase
          .from("pandascore_matches")
          .select("teams, esport_type, start_time")
          .gte("match_date", lookbackStart)
          .lte("match_date", lookbackEnd)
          .not("teams", "is", null)
          .limit(500);
        if (recentErr) console.error("Error fetching recent matches:", recentErr);
        else console.log("Recent matches (60 days):", recentMatches?.length || 0);

        // Add teams from recent history that aren't already in the map
        (recentMatches || []).forEach((m: any) => {
          if (Array.isArray(m.teams)) {
            m.teams.forEach((t: any) => {
              if (t?.type === "Team" && t?.opponent?.id) {
                const id = String(t.opponent.id);
                if (!proTeamMap.has(id)) {
                  const name = t.opponent.name || t.opponent.slug || "Unknown Team";
                  // Use 1 as placeholder match volume since we're inferring from history
                  proTeamMap.set(id, { id, name, esport_type: m.esport_type, match_volume: 1 });
                }
              }
            });
          }
        });
      }

      console.log("Pro teams found:", proTeamMap.size);

      // Parallel fetch of pro team stats
      const proStatsPromises = Array.from(proTeamMap.entries()).map(async ([teamId, info]) => {
        try {
          const { data: statsData, error: statsErr } = await (supabase as any).rpc("get_team_stats_optimized", { p_team_id: teamId });
          if (statsErr) console.error("get_team_stats_optimized error", teamId, statsErr);
          const stats = Array.isArray(statsData) ? statsData[0] : statsData;
          const recent_win_rate = stats?.win_rate ? Number(stats.win_rate) / 100 : 0.5;
          const base_score = (recent_win_rate * 10) + (info.match_volume * 2);
          const raw_price = base_score * Number(PRO_MULTIPLIER);
          const price = clamp(Math.round(raw_price), Number(MIN_PRICE), Number(MAX_PRICE));
          return { teamId, price, info, recent_win_rate };
        } catch (e) {
          console.error("Error fetching pro stats for", teamId, e);
          return null;
        }
      });
      const proStatsResults = (await Promise.all(proStatsPromises)).filter(Boolean) as any[];

      // Upsert all pro teams sequentially (can batch here too if needed)
      for (const p of proStatsResults) {
        try {
          const { error: upErr } = await supabase
            .from("fantasy_team_prices")
            .upsert({
              round_id: r.id,
              team_type: "pro",
              team_id: p.teamId,
              team_name: p.info.name,
              price: p.price,
              recent_win_rate: p.recent_win_rate,
              match_volume: p.info.match_volume,
              last_price_update: new Date().toISOString(),
            }, { onConflict: "round_id,team_type,team_id" });
          if (upErr) throw upErr;
          results.push({ round_id: r.id, team_type: "pro", team_id: p.teamId, price: p.price });
        } catch (e) {
          console.error("Upsert error (pro)", { round: r.id, teamId: p.teamId, error: e });
        }
      }

      // 2) AMATEUR TEAMS - Using match_date for much faster lookups
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      
      let prevStart: Date;
      let prevEnd: Date;
      let amateurStartDate: string;
      let amateurEndDate: string;
      
      // For scheduled/future rounds, use lookback from today
      if (isScheduledRound) {
        // Use 3 months lookback from today for scheduled rounds
        prevEnd = now;
        prevStart = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        // For "current window" teams, also use recent history since round hasn't started
        amateurStartDate = prevStart.toISOString().split('T')[0];
        amateurEndDate = prevEnd.toISOString().split('T')[0];
        console.log("Using 3-month lookback from today for scheduled round amateur pricing");
      } else if (r.is_private || r.type === 'private') {
        // For private rounds, use 3-month lookback from round start
        prevEnd = start;
        prevStart = new Date(start.getTime() - (90 * 24 * 60 * 60 * 1000));
        amateurStartDate = start.toISOString().split('T')[0];
        amateurEndDate = end.toISOString().split('T')[0];
        console.log("Using 3-month lookback for private round amateur pricing");
      } else {
        // For daily/weekly/monthly: use mirror window (existing logic)
        prevEnd = start;
        prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
        amateurStartDate = start.toISOString().split('T')[0];
        amateurEndDate = end.toISOString().split('T')[0];
        console.log("Using mirror window for public round amateur pricing");
      }
      
      const prevStartDate = prevStart.toISOString().split('T')[0];
      const prevEndDate = prevEnd.toISOString().split('T')[0];
      console.log("Amateur window", { round_id: r.id, is_private: r.is_private, type: r.type, isScheduledRound, prevStartDate, prevEndDate });

      const { data: prevStats, error: prevErr } = await (supabase as any).rpc(
        "get_faceit_teams_prev_window_stats",
        { start_date: prevStartDate, end_date: prevEndDate }
      );
      if (prevErr) console.error("get_faceit_teams_prev_window_stats error", prevErr);
      else console.log("prevStats count:", prevStats?.length || 0);

      // For scheduled rounds, use the lookback window as "current" since round hasn't started
      const { data: currentFaceitTeams, error: currentErr } = await (supabase as any).rpc(
        "get_all_faceit_teams", 
        { start_date: amateurStartDate, end_date: amateurEndDate }
      );
      if (currentErr) console.error("get_all_faceit_teams error", currentErr);
      else console.log("currentFaceitTeams count:", currentFaceitTeams?.length || 0);

      // Create unified map of ALL teams from both windows
      const allTeamsMap = new Map<string, any>();

      // Add current window teams
      (currentFaceitTeams || []).forEach((t: any) => {
        allTeamsMap.set(t.team_id, {
          team_id: t.team_id,
          team_name: t.team_name,
          in_current_window: true,
          in_prev_window: false,
          matches_played: 0,
          missed_pct: 0
        });
      });

      // Add/update with previous window stats
      (prevStats || []).forEach((s: any) => {
        const existing = allTeamsMap.get(s.team_id);
        if (existing) {
          existing.in_prev_window = true;
          existing.matches_played = s.matches_played;
          existing.missed_pct = s.missed_pct;
        } else {
          // Team only in previous window
          allTeamsMap.set(s.team_id, {
            team_id: s.team_id,
            team_name: s.team_name || `Team ${s.team_id}`,
            in_current_window: false,
            in_prev_window: true,
            matches_played: s.matches_played,
            missed_pct: s.missed_pct
          });
        }
      });

      console.log("Total unique amateur teams (both windows):", allTeamsMap.size);

      // Batch fetch win rates for all amateur teams
      const teamNames = Array.from(allTeamsMap.values()).map(t => t.team_name);
      const { data: batchStats, error: statsErr } = await (supabase as any).rpc(
        'get_faceit_teams_stats_batch',
        { team_names: teamNames, game_filter: null }
      );
      if (statsErr) console.error("get_faceit_teams_stats_batch error", statsErr);
      console.log("Batch stats retrieved for teams:", batchStats?.length || 0);

      // Create lookup map: team_name -> win_rate
      const statsMap = new Map<string, number>();
      ((batchStats as any[]) || []).forEach((stat: any) => {
        statsMap.set(stat.team_name, stat.recent_win_rate_30d || stat.win_rate || 50);
      });

      // Prepare batched amateur upsert from ALL teams with actual win rates
      const amateurRows = Array.from(allTeamsMap.values()).map((t: any) => {
        const abandon_rate = typeof t.missed_pct === "number" ? Math.max(0, Math.min(100, Number(t.missed_pct))) / 100 : 0;
        const match_volume = t.matches_played || 0;
        
        // GET ACTUAL WIN RATE from batch stats, fallback to 50
        const win_rate_percent = statsMap.get(t.team_name) || 50;
        const recent_win_rate = win_rate_percent / 100;
        
        const base_score = recent_win_rate * 10 - abandon_rate * Number(ABANDON_PENALTY_MULTIPLIER);
        const raw_price = base_score * Number(AMATEUR_MULTIPLIER);
        const price = clamp(Math.round(raw_price), Number(MIN_PRICE), Number(MAX_PRICE));
        results.push({ round_id: r.id, team_type: "amateur", team_id: t.team_id, price });
        return {
          round_id: r.id,
          team_type: "amateur",
          team_id: t.team_id,
          team_name: t.team_name,
          price,
          recent_win_rate,
          abandon_rate,
          match_volume,
          last_price_update: new Date().toISOString(),
        };
      });

      if (amateurRows.length > 0) {
        const { error: upErr } = await supabase
          .from("fantasy_team_prices")
          .upsert(amateurRows, { onConflict: "round_id,team_type,team_id" });
        if (upErr) console.error("Batch upsert error (amateur)", upErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, updated: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("calculate-team-prices error", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
