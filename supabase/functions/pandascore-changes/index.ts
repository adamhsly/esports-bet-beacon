// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility to compare teams arrays (opponents)
function teamsAreDifferent(apiTeams: any[], dbTeams: any[]): boolean {
  if (!apiTeams || !dbTeams) return true;
  if (apiTeams.length !== dbTeams.length) return true;
  for (let i = 0; i < apiTeams.length; i++) {
    if (JSON.stringify(apiTeams[i]) !== JSON.stringify(dbTeams[i])) {
      return true;
    }
  }
  return false;
}

serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PANDA_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Missing one or more required environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error: testError } = await supabase
    .from("pandascore_matches")
    .select("match_id")
    .limit(1);

  if (testError) {
    console.error("❌ Supabase connection test failed:", testError);
    return new Response(
      JSON.stringify({ error: "Supabase credentials appear to be invalid." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const BASE_URL = "https://api.pandascore.co/matches";
  const PER_PAGE = 50;

  // Limit date range: yesterday, today, and tomorrow
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(todayStart.getUTCDate() - 1);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(todayStart.getUTCDate() + 1);
  const dateRangeStr = `${yesterdayStart.toISOString().slice(0, 10)},${tomorrowStart.toISOString().slice(0, 10)}`;

  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page", "max_page")
    .eq("id", "matches")
    .maybeSingle();

  let lastPage = (syncState?.last_page ?? 0) + 1;
  const maxPage = syncState?.max_page ?? 0;

  const headRes = await fetch(`${BASE_URL}?per_page=1&range[scheduled_at]=${dateRangeStr}`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  });

  if (!headRes.ok) {
    console.error("Failed to fetch total matches count:", await headRes.text());
    return new Response(
      JSON.stringify({ error: "Failed to fetch total matches count" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const totalMatches = Number(headRes.headers.get("X-Total") ?? 0);
  const computedMaxPage = Math.ceil(totalMatches / PER_PAGE);

  if (computedMaxPage !== maxPage) {
    await supabase.from("pandascore_sync_state").upsert(
      { id: "matches", max_page: computedMaxPage },
      { onConflict: ["id"] }
    );
  }

  let totalFetched = 0;

  while (lastPage <= computedMaxPage) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${lastPage}&range[scheduled_at]=${dateRangeStr}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`PandaScore error on page ${lastPage}:`, await res.text());
      break;
    }

    let matches;
    try {
      matches = await res.json();
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      break;
    }

    if (!Array.isArray(matches) || matches.length === 0) break;

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("status", "teams")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError);
        continue;
      }

      const existingStatus = existing?.status ?? null;
      const existingTeams = existing?.teams ?? [];
      const apiStatus = match.status ?? null;
      const apiTeams = match.opponents ?? [];

      if (existingStatus === apiStatus && !teamsAreDifferent(apiTeams, existingTeams)) continue;

      const mapped = {
        match_id,
        esport_type: match.videogame?.name ?? null,
        slug: match.slug ?? null,
        draw: match.draw ?? null,
        forfeit: match.forfeit ?? null,
        start_time: match.begin_at ?? null,
        end_time: match.end_at ?? null,
        original_scheduled_at: match.original_scheduled_at ?? null,
        rescheduled: match.rescheduled ?? null,
        detailed_stats: match.detailed_stats ?? null,
        winner_id: match.winner_id?.toString() ?? null,
        winner_type: match.winner_type ?? null,
        videogame_id: match.videogame?.id?.toString() ?? null,
        videogame_name: match.videogame?.name ?? null,
        stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
        stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
        modified_at: match.modified_at ?? null,
        status: match.status ?? null, // initial status from API
        match_type: match.match_type ?? null,
        number_of_games: match.number_of_games ?? null,
        tournament_id: match.tournament?.id?.toString() ?? null,
        tournament_name: match.tournament?.name ?? null,
        league_id: match.league?.id?.toString() ?? null,
        league_name: match.league?.name ?? null,
        serie_id: match.serie?.id?.toString() ?? null,
        serie_name: match.serie?.name ?? null,
        teams: match.opponents ?? [],
        raw_data: match,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        created_at: existing ? undefined : new Date().toISOString(),
      };

      // Consistency fix: ensure status matches raw_data status if missing or mismatched
      mapped.status = mapped.status ?? mapped.raw_data?.status ?? null;

      const { error } = await supabase
        .from("pandascore_matches")
        .upsert(mapped, { onConflict: ["match_id"] });

      if (error) {
        console.error(`❌ Failed to upsert match ${match_id}:`, error);
      } else {
        console.log(`✅ Upserted match ${match_id}`);
        totalFetched++;
      }
    }

    await supabase.from("pandascore_sync_state").upsert(
      {
        id: "matches",
        last_page: lastPage,
        max_page: computedMaxPage,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ["id"] }
    );

    lastPage++;
    await sleep(1000);
  }

  await supabase.from("pandascore_sync_state").upsert(
    {
      id: "matches",
      last_page: 0,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: ["id"] }
  );

  // --- Update live running matches ---
  async function updateLiveRunningMatches() {
    console.log('Fetching live running matches...');
    const RUNNING_URL = `${BASE_URL}/running`;

    const res = await fetch(RUNNING_URL, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error('Failed to fetch running matches:', await res.text());
      return;
    }

    const runningMatches = await res.json();

    if (!Array.isArray(runningMatches) || runningMatches.length === 0) {
      console.log('No live running matches currently.');
      return;
    }

    for (const match of runningMatches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("id")
        .eq("match_id", match_id)
        .maybeSingle();

      if (!existing || fetchError) continue;

      //
