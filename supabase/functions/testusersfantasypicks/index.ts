// seed-random-picks/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const DEFAULTS = {
  TEAM_COUNT: 5,
  BUDGET: 50,
  USER_SAMPLE: 200,
  ROUND_TYPE: null,
  FACEIT_DAYS_LOOKBACK: 120,
  PANDASCORE_DAYS_LOOKBACK: 120
};

// --- Utils ---
function shuffleInPlace(arr) {
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.random() * (i + 1) | 0;
    [arr[i], arr[j]] = [
      arr[j],
      arr[i]
    ];
  }
}

// Normalize for robust name matching:
// - Unicode normalize
// - remove diacritics
// - collapse internal whitespace
// - trim
// - lowercase
function normalizeName(s) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
  .replace(/\s+/g, " ").trim().toLowerCase();
}

function tryBuildRandomPickset(teams, teamCount, budget) {
  const MAX_ATTEMPTS = 300;
  const eligible = teams.filter((t)=>t.price > 0 && t.price <= budget);
  if (eligible.length < teamCount) return null;
  for(let attempt = 0; attempt < MAX_ATTEMPTS; attempt++){
    shuffleInPlace(eligible);
    const pick = [];
    let spend = 0;
    for (const t of eligible){
      const duplicate = pick.some((p)=>p.team_type === t.team_type && p.team_id === t.team_id);
      if (!duplicate && spend + t.price <= budget) {
        pick.push(t);
        spend += t.price;
        if (pick.length === teamCount) return pick;
      }
    }
  }
  return null;
}

async function batchedUpsert(supabase, table, rows, batchSize = 300, onConflict) {
  let totalRequested = 0;
  for(let i = 0; i < rows.length; i += batchSize){
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk, {
      onConflict,
      ignoreDuplicates: true,
      returning: "minimal"
    });
    if (error) throw error;
    totalRequested += chunk.length; // includes ignored duplicates
  }
  return totalRequested;
}

/**
 * Build Map<normalized_team_name, logo_url>.
 * Amateur logos from faceit_matches factions' avatars.
 * Pro logos from pandascore_matches teams[].opponent.image_url.
 * Joins are case/space-insensitive using lower(trim(...)) on the SQL side,
 * and normalized strings on the client side.
 */ 
async function buildLogoMap(supabase, amateurNamesOriginal, proNamesOriginal, faceitDaysLookback, pandaDaysLookback) {
  const logoMap = new Map();
  // Prepare normalized name arrays + back-mapping if needed
  const amateurNames = Array.from(new Set(amateurNamesOriginal.filter(Boolean).map((n)=>normalizeName(n))));
  const proNames = Array.from(new Set(proNamesOriginal.filter(Boolean).map((n)=>normalizeName(n))));
  
  // --- Amateur via faceit_matches (RPC path) ---
  if (amateurNames.length) {
    const faceitSql = `
      with names as (
        select unnest($1::text[]) as name
      ),
      f1 as (
        select
          lower(btrim(fm.faction1_name)) as name,
          (fm.teams->'faction1'->>'avatar') as avatar
        from public.faceit_matches fm
        join names n
          on lower(btrim(fm.faction1_name)) = n.name
        where fm.started_at >= now() - interval '${faceitDaysLookback} days'
      ),
      f2 as (
        select
          lower(btrim(fm.faction2_name)) as name,
          (fm.teams->'faction2'->>'avatar') as avatar
        from public.faceit_matches fm
        join names n
          on lower(btrim(fm.faction2_name)) = n.name
        where fm.started_at >= now() - interval '${faceitDaysLookback} days'
      ),
      u as (
        select * from f1
        union all
        select * from f2
      )
      select name,
             (array_remove(array_agg(coalesce(avatar, '')), ''))[1] as avatar
      from u
      group by name
    `;
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql: faceitSql,
        params: [
          amateurNames
        ]
      });
      if (error) throw error;
      (data ?? []).forEach((row)=>{
        if (row?.name) logoMap.set(row.name, row.avatar || "");
      });
    } catch  {
      // Fallback (no RPC): do two IN queries, then normalize names client-side
      const sinceIso = new Date(Date.now() - faceitDaysLookback * 86400_000).toISOString();
      const { data: f1 } = await supabase.from("faceit_matches").select("faction1_name, teams, started_at").gte("started_at", sinceIso);
      for (const row of f1 ?? []){
        const nameRaw = row.faction1_name ?? null;
        const name = nameRaw ? normalizeName(nameRaw) : null;
        const avatar = row.teams?.faction1?.avatar ?? "";
        if (name && avatar && amateurNames.includes(name) && !logoMap.has(name)) {
          logoMap.set(name, avatar);
        }
      }
      const { data: f2 } = await supabase.from("faceit_matches").select("faction2_name, teams, started_at").gte("started_at", sinceIso);
      for (const row of f2 ?? []){
        const nameRaw = row.faction2_name ?? null;
        const name = nameRaw ? normalizeName(nameRaw) : null;
        const avatar = row.teams?.faction2?.avatar ?? "";
        if (name && avatar && amateurNames.includes(name) && !logoMap.has(name)) {
          logoMap.set(name, avatar);
        }
      }
    }
  }
  
  // --- Pro via pandascore_matches (RPC path) ---
  if (proNames.length) {
    const pandaSql = `
      with names as (
        select unnest($1::text[]) as name
      ),
      x as (
        select
          lower(btrim(elem->'opponent'->>'name')) as name,
          (elem->'opponent'->>'image_url') as image_url
        from public.pandascore_matches pm,
             jsonb_array_elements(pm.teams) elem
        where pm.start_time >= now() - interval '${pandaDaysLookback} days'
          and elem->>'type' = 'Team'
      )
      select n.name,
             (array_remove(array_agg(coalesce(x.image_url, '')), ''))[1] as image_url
      from names n
      left join x on x.name = n.name
      group by n.name
    `;
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql: pandaSql,
        params: [
          proNames
        ]
      });
      if (error) throw error;
      (data ?? []).forEach((row)=>{
        if (row?.name && row?.image_url) logoMap.set(row.name, row.image_url);
      });
    } catch  {
    // No robust non-RPC fallback for JSON array search. Consider a materialized teams table if needed.
    }
  }
  return logoMap; // keys are normalized names
}

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const body = await req.json().catch(()=>({}));
    const TEAM_COUNT = Number(body?.TEAM_COUNT ?? DEFAULTS.TEAM_COUNT);
    const BUDGET = Number(body?.BUDGET ?? DEFAULTS.BUDGET);
    const USER_SAMPLE = Number(body?.USER_SAMPLE ?? DEFAULTS.USER_SAMPLE);
    const ROUND_TYPE = body?.ROUND_TYPE ?? DEFAULTS.ROUND_TYPE;
    const DRY_RUN = Boolean(body?.dryRun ?? false);
    const FACEIT_DAYS_LOOKBACK = Number(body?.FACEIT_DAYS_LOOKBACK ?? DEFAULTS.FACEIT_DAYS_LOOKBACK);
    const PANDASCORE_DAYS_LOOKBACK = Number(body?.PANDASCORE_DAYS_LOOKBACK ?? DEFAULTS.PANDASCORE_DAYS_LOOKBACK);
    
    // Fetch all open/active rounds (optionally filter by type)
    // ✅ FIX #2: Filter out private rounds
    let q = supabase.from("fantasy_rounds")
      .select("id, type, start_date, end_date, status, is_private")
      .in("status", ["open", "active"])
      .eq("is_private", false)  // Only public rounds
      .order("start_date", { ascending: false });
    if (ROUND_TYPE) q = q.eq("type", ROUND_TYPE);
    
    const { data: rounds, error: rErr } = await q;
    if (rErr) throw rErr;
    if (!rounds || rounds.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        message: "No open/active public rounds found.",
        type: ROUND_TYPE
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const perRoundResults = [];
    for (const round of rounds){
      console.log(`[round] id=${round.id}, type=${round.type}, status=${round.status}, is_private=${round.is_private ?? false}, window=${round.start_date}..${round.end_date}`);
      
      // Teams for this round (no logos here)
      const { data: teamsRaw, error: tErr } = await supabase.from("fantasy_team_prices").select("team_type, team_id, team_name, price").eq("round_id", round.id);
      if (tErr) throw tErr;
      const allTeams = (teamsRaw ?? []).map((t)=>({
          team_type: String(t.team_type),
          team_id: String(t.team_id),
          team_name: t.team_name ?? null,
          price: Number(t.price)
        })).filter((t)=>Number.isFinite(t.price) && t.price > 0);
      console.log(`[teams] round=${round.id} total=${allTeams.length}, <=budget=${allTeams.filter((t)=>t.price <= BUDGET).length}`);
      
      if (!allTeams.length) {
        perRoundResults.push({
          round_id: round.id,
          round_type: round.type ?? null,
          status: round.status,
          window: {
            start: round.start_date,
            end: round.end_date
          },
          teams_total: 0,
          users_considered: 0,
          picks_created: 0,
          failed_to_build: 0,
          team_count: TEAM_COUNT,
          budget: BUDGET,
          dryRun: DRY_RUN,
          note: "no_teams_for_round"
        });
        continue;
      }
      
      // Build logo map (keys = normalized names)
      const uniqueAmateurNames = Array.from(new Set(allTeams.filter((t)=>t.team_type === "amateur").map((t)=>t.team_name).filter(Boolean)));
      const uniqueProNames = Array.from(new Set(allTeams.filter((t)=>t.team_type === "pro").map((t)=>t.team_name).filter(Boolean)));
      const logoMap = await buildLogoMap(supabase, uniqueAmateurNames, uniqueProNames, FACEIT_DAYS_LOOKBACK, PANDASCORE_DAYS_LOOKBACK);
      
      // Eligible users without an existing pick for this round
      const { data: users, error: uErr } = await supabase.rpc("exec_sql", {
        sql: `
          with candidates as (
            select p.id
            from public.profiles p
            left join public.fantasy_round_picks rp
              on rp.user_id = p.id
             and rp.round_id = $1
            where p.test = true
              and rp.id is null
          )
          select id from candidates
          order by random()
          limit $2
        `,
        params: [
          round.id,
          USER_SAMPLE
        ]
      });
      let userList = users ?? [];
      if (uErr || !userList?.length) {
        console.log(`[users] round=${round.id} exec_sql missing/empty; fallback query`);
        const { data: fallback } = await supabase.from("profiles").select("id").eq("test", true);
        const { data: already } = await supabase.from("fantasy_round_picks").select("user_id").eq("round_id", round.id);
        const alreadySet = new Set((already ?? []).map((r)=>r.user_id));
        const eligible = (fallback ?? []).filter((r)=>!alreadySet.has(r.id));
        shuffleInPlace(eligible);
        userList = eligible.slice(0, USER_SAMPLE);
      }
      console.log(`[users] round=${round.id} eligible=${userList.length} (sample requested=${USER_SAMPLE})`);
      
      if (!userList.length) {
        perRoundResults.push({
          round_id: round.id,
          round_type: round.type ?? null,
          status: round.status,
          window: {
            start: round.start_date,
            end: round.end_date
          },
          teams_total: allTeams.length,
          users_considered: 0,
          picks_created: 0,
          failed_to_build: 0,
          team_count: TEAM_COUNT,
          budget: BUDGET,
          dryRun: DRY_RUN,
          note: "no_eligible_users"
        });
        continue;
      }
      
      const rows = [];
      let couldNotBuild = 0;
      for (const u of userList){
        const pick = tryBuildRandomPickset(allTeams, TEAM_COUNT, BUDGET);
        if (!pick) {
          couldNotBuild++;
          continue;
        }
        
        // ✅ FIX #1: Store picks in correct format [{ id, name, type, logo_url }]
        const persisted = pick.map((p)=>{
          const name = p.team_name ?? String(p.team_id);
          const normalizedName = normalizeName(name);
          const logoUrl = logoMap.get(normalizedName) ?? "";
          return {
            id: String(p.team_id),
            name,
            type: p.team_type,
            logo_url: logoUrl
          };
        });
        
        rows.push({
          user_id: u.id,
          round_id: round.id,
          team_picks: persisted,  // ✅ Direct array, not JSON.stringify()
          bench_team: null,
          total_score: 0,
          submitted_at: new Date().toISOString()
        });
      }
      
      console.log(`[picks] round=${round.id} built=${rows.length}, failed_to_build=${couldNotBuild}`);
      
      if (DRY_RUN) {
        perRoundResults.push({
          round_id: round.id,
          round_type: round.type ?? null,
          status: round.status,
          window: {
            start: round.start_date,
            end: round.end_date
          },
          teams_total: allTeams.length,
          users_considered: userList.length,
          picks_created: rows.length,
          failed_to_build: couldNotBuild,
          team_count: TEAM_COUNT,
          budget: BUDGET,
          dryRun: true,
          sample_pick: rows.length ? rows[0].team_picks : null
        });
        continue;
      }
      
      const insertedRequested = await batchedUpsert(supabase, "fantasy_round_picks", rows, 300, "user_id,round_id");
      perRoundResults.push({
        round_id: round.id,
        round_type: round.type ?? null,
        status: round.status,
        window: {
          start: round.start_date,
          end: round.end_date
        },
        teams_total: allTeams.length,
        users_considered: userList.length,
        picks_created: insertedRequested,
        failed_to_build: couldNotBuild,
        team_count: TEAM_COUNT,
        budget: BUDGET,
        dryRun: false
      });
    }
    
    const totals = perRoundResults.reduce((acc, r)=>{
      acc.rounds += 1;
      acc.picks_created += r.picks_created;
      acc.users_considered += r.users_considered;
      acc.failed_to_build += r.failed_to_build;
      return acc;
    }, {
      rounds: 0,
      picks_created: 0,
      users_considered: 0,
      failed_to_build: 0
    });
    
    return new Response(JSON.stringify({
      ok: true,
      rounds_processed: perRoundResults.length,
      totals,
      per_round: perRoundResults,
      team_count: TEAM_COUNT,
      budget: BUDGET,
      type_filter: ROUND_TYPE,
      dryRun: DRY_RUN
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("seed-random-picks error", err);
    return new Response(JSON.stringify({
      ok: false,
      error: err?.message || String(err)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
