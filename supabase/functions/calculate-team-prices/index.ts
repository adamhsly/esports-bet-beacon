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

    let rounds: Array<{ id: string; type: string; start_date: string; end_date: string }>;
    if (round_id) {
      const { data, error } = await supabase
        .from("fantasy_rounds")
        .select("id, type, start_date, end_date")
        .eq("id", round_id)
        .maybeSingle();
      if (error) throw error;
      rounds = data ? [data] as any : [];
    } else {
      const { data, error } = await supabase
        .from("fantasy_rounds")
        .select("id, type, start_date, end_date")
        .in("status", ["open", "active"]);
      if (error) throw error;
      rounds = (data || []) as any;
    }

    const results: any[] = [];

    for (const r of rounds) {
      console.log("=== Processing round ===", r);

      // 1) PRO TEAMS - Using match_date for much faster lookups
      const startDate = new Date(r.start_date).toISOString().split('T')[0];
      const endDate = new Date(r.end_date).toISOString().split('T')[0];
      
      const { data: pandaMatches, error: pandaErr } = await supabase
        .from("pandascore_matches")
        .select("teams, esport_type, start_time")
        .gte("match_date", startDate)
        .lte("match_date", endDate)
        .not("teams", "is", null);
      if (pandaErr) throw pandaErr;
      console.log("pandaMatches count:", pandaMatches?.length || 0);

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
      console.log("Pro teams found:", proTeamMap.size);

      // Parallel fetch of pro team stats
      const proStatsPromises = Array.from(proTeamMap.entries()).map(async ([teamId, info]) => {
        try {
          const { data: stats, error: statsErr } = await (supabase as any).rpc("get_team_stats_optimized", { team_id: teamId });
          if (statsErr) console.error("get_team_stats_optimized error", teamId, statsErr);
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
      const prevEnd = start;
      const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
      
      const prevStartDate = prevStart.toISOString().split('T')[0];
      const prevEndDate = prevEnd.toISOString().split('T')[0];
      console.log("Amateur window", { round_id: r.id, prevStartDate, prevEndDate });

      const { data: prevStats, error: prevErr } = await (supabase as any).rpc(
        "get_faceit_teams_prev_window_stats",
        { start_date: prevStartDate, end_date: prevEndDate }
      );
      if (prevErr) console.error("get_faceit_teams_prev_window_stats error", prevErr);
      else console.log("prevStats count:", prevStats?.length || 0);

      const { data: allFaceitTeams, error: allErr } = await (supabase as any).rpc(
        "get_all_faceit_teams", 
        { start_date: startDate, end_date: endDate }
      );
      if (allErr) console.error("get_all_faceit_teams error", allErr);
      else console.log("allFaceitTeams count:", allFaceitTeams?.length || 0);

      const statsMap = new Map<string, any>();
      (prevStats || []).forEach((s: any) => statsMap.set(s.team_id, s));

      // Prepare batched amateur upsert
      const amateurRows = (allFaceitTeams || []).map((t: any) => {
        const s = statsMap.get(t.team_id);
        if (!s) console.log(`No prev window stats for team ${t.team_id}`);
        const abandon_rate = typeof s?.missed_pct === "number" ? Math.max(0, Math.min(100, Number(s.missed_pct))) / 100 : 0;
        const match_volume = s?.matches_played || 0; // Use matches_played from stats
        const recent_win_rate = 0.5;
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
