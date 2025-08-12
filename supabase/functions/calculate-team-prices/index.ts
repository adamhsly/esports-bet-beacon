import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helpers
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Determine rounds to process
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
      // 1) PRO TEAMS - derive from pandascore_matches
      const { data: pandaMatches, error: pandaErr } = await supabase
        .from("pandascore_matches")
        .select("teams, esport_type, start_time")
        .gte("start_time", r.start_date)
        .lte("start_time", r.end_date)
        .not("teams", "is", null);
      if (pandaErr) throw pandaErr;

      const proTeamMap = new Map<string, { id: string; name: string; esport_type?: string; match_volume: number }>();
      (pandaMatches || []).forEach((m: any) => {
        if (Array.isArray(m.teams)) {
          m.teams.forEach((t: any) => {
            if (t?.type === "Team" && t?.opponent?.id) {
              const id = String(t.opponent.id);
              const name = t.opponent.name || t.opponent.slug || "Unknown Team";
              const existing = proTeamMap.get(id);
              if (existing) existing.match_volume += 1; else proTeamMap.set(id, { id, name, esport_type: m.esport_type, match_volume: 1 });
            }
          });
        }
      });

      for (const [teamId, info] of proTeamMap.entries()) {
        // get optimized team stats (win_rate in %)
        const { data: stats, error: statsErr } = await (supabase as any).rpc("get_team_stats_optimized", { team_id: teamId });
        if (statsErr) {
          console.error("get_team_stats_optimized error", teamId, statsErr);
        }
        const recent_win_rate = stats?.win_rate ? Number(stats.win_rate) / 100 : 0.5; // fallback 50%
        const base_score = (recent_win_rate * 10) + (info.match_volume * 2);
        const raw_price = base_score * Number(PRO_MULTIPLIER);
        const price = clamp(Math.round(raw_price), Number(MIN_PRICE), Number(MAX_PRICE));

        const { error: upErr } = await supabase.from("fantasy_team_prices").upsert({
          round_id: r.id,
          team_type: "pro",
          team_id: teamId,
          team_name: info.name,
          price,
          recent_win_rate,
          match_volume: info.match_volume,
          last_price_update: new Date().toISOString(),
        }, { onConflict: "round_id,team_type,team_id" });
        if (upErr) throw upErr;
        results.push({ round_id: r.id, team_type: "pro", team_id: teamId, price });
      }

      // 2) AMATEUR TEAMS - Faceit style using previous window stats
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const prevEnd = start;
      const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

      const { data: prevStats, error: prevErr } = await (supabase as any).rpc("get_faceit_teams_prev_window_stats", {
        start_ts: prevStart.toISOString(),
        end_ts: prevEnd.toISOString(),
      });
      if (prevErr) throw prevErr;

      const { data: allFaceitTeams, error: allErr } = await (supabase as any).rpc("get_all_faceit_teams");
      if (allErr) throw allErr;

      const statsMap = new Map<string, any>();
      (prevStats || []).forEach((s: any) => statsMap.set(s.team_id, s));

      for (const t of (allFaceitTeams || [])) {
        const s = statsMap.get(t.team_id);
        const abandon_rate = typeof s?.missed_pct === 'number' ? Math.max(0, Math.min(100, Number(s.missed_pct))) / 100 : 0;
        // TODO: If you have team-level recent win rate for amateurs, compute it here. Fallback to 0.5
        const recent_win_rate = 0.5;
        const base_score = (recent_win_rate * 10) - (abandon_rate * Number(ABANDON_PENALTY_MULTIPLIER));
        const raw_price = base_score * Number(AMATEUR_MULTIPLIER);
        const price = clamp(Math.round(raw_price), Number(MIN_PRICE), Number(MAX_PRICE));

        const { error: upErr2 } = await supabase.from("fantasy_team_prices").upsert({
          round_id: r.id,
          team_type: "amateur",
          team_id: t.team_id,
          team_name: t.team_name,
          price,
          recent_win_rate,
          abandon_rate,
          last_price_update: new Date().toISOString(),
        }, { onConflict: "round_id,team_type,team_id" });
        if (upErr2) throw upErr2;
        results.push({ round_id: r.id, team_type: "amateur", team_id: t.team_id, price });
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
