// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTeamIds(opponents: any[]): string[] {
  return opponents
    .map((o) => o.opponent?.id?.toString())
    .filter(Boolean)
    .sort(); // sort for consistent comparison
}

function resultsChanged(local: any[], remote: any[]): boolean {
  if (local.length !== remote.length) return true;
  for (let i = 0; i < local.length; i++) {
    if (
      local[i].team_id?.toString() !== remote[i].team_id?.toString() ||
      local[i].score !== remote[i].score
    ) {
      return true;
    }
  }
  return false;
}

serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY");

  console.log("SUPABASE_URL present:", !!SUPABASE_URL);
  console.log("SERVICE_ROLE_KEY present:", !!SERVICE_ROLE_KEY);
  console.log("PANDA_SCORE_API_KEY present:", !!PANDA_API_TOKEN);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PANDA_API_TOKEN) {
    return new Response(
      JSON.stringify({
        error: "Missing one or more required environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Quick connection test
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

  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // We'll filter matches for today using date range query params 'range[begin_at]'
  // from pandascore API docs: range[begin_at]=YYYY-MM-DDT00:00:00Z,YYYY-MM-DDT23:59:59Z

  const rangeParam = `range[begin_at]=${isoToday}T00:00:00Z,${isoToday}T23:59:59Z`;

  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page")
    .eq("id", "matches")
    .maybeSingle();

  let page = (syncState?.last_page ?? 0) + 1;
  let totalFetched = 0;

  while (true) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&${rangeParam}&sort=modified_at`;

    console.log(`Fetching page ${page}: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`PandaScore error on page ${page}:`, await res.text());
      break;
    }

    const text = await res.text();
    let matches;
    try {
      matches = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      break;
    }

    if (!Array.isArray(matches) || matches.length === 0) {
      console.log("No more matches found, ending sync.");
      break;
    }

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("status, start_time, end_time, teams, results")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError);
        continue;
      }

      const remoteTeamIds = normalizeTeamIds(match.opponents ?? []);
      const localTeamIds = normalizeTeamIds(existing?.teams ?? []);
      const localResults = existing?.results ?? [];
      const remoteResults = match.results ?? [];

      const changed =
        !existing ||
        existing.status !== match.status ||
        existing.start_time !== match.begin_at ||
        existing.end_time !== match.end_at ||
        JSON.stringify(localTeamIds) !== JSON.stringify(remoteTeamIds) ||
        resultsChanged(localResults, remoteResults);

      if (!changed) {
        console.log(`⏭️ Skipping unchanged match ${match_id}`);
        continue;
      }

      // Map data for upsert
      const mapped = {
        match_id,
        esport_type: match.videogame?.name ?? null,
        slug: match.slug,
        draw: match.draw,
        forfeit: match.forfeit,
        start_time: match.begin_at,
        end_time: match.end_at,
        original_scheduled_at: match.original_scheduled_at,
        rescheduled: match.rescheduled,
        detailed_stats: match.detailed_stats,
        winner_id: match.winner_id?.toString() ?? null,
        winner_type: match.winner_type ?? null,
        videogame_id: match.videogame?.id?.toString() ?? null,
        videogame_name: match.videogame?.name ?? null,
        stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
        stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
        status: match.status,
        match_type: match.match_type,
        number_of_games: match.number_of_games,
        tournament_id: match.tournament?.id?.toString() ?? null,
        tournament_name: match.tournament?.name ?? null,
        league_id: match.league?.id?.toString() ?? null,
        league_name: match.league?.name ?? null,
        serie_id: match.serie?.id?.toString() ?? null,
        serie_name: match.serie?.name ?? null,
        teams: match.opponents ?? [],
        results: match.results ?? [],
        raw_data: match,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        created_at: existing ? undefined : new Date().toISOString(),
      };

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

    // Update sync state
    const { error: syncUpdateError } = await supabase
      .from("pandascore_sync_state")
      .upsert(
        {
          id: "matches",
          last_page: page,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: ["id"] }
      );

    if (syncUpdateError) {
      console.error(`❌ Failed to update sync state for page ${page}:`, syncUpdateError);
    }

    page++;
    await sleep(1000);
  }

  // Reset last_page to 0 at end so next run starts fresh
  const { error: resetError } = await supabase
    .from("pandascore_sync_state")
    .upsert(
      {
        id: "matches",
        last_page: 0,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ["id"] }
    );

  if (resetError) {
    console.error("❌ Failed to reset last_page to 0:", resetError);
  } else {
    console.log("🔄 Reset last_page to 0");
  }

  return new Response(JSON.stringify({ status: "done", total: totalFetched }), {
    headers: { "Content-Type": "application/json" },
  });
});
