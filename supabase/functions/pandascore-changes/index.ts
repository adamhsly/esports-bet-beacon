// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Quick Supabase connection check
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

  // Calculate date range from yesterday 00:00 UTC to day after tomorrow 00:00 UTC
  const now = new Date();
  const yesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0)).toISOString();
  const dayAfterTomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 0, 0, 0)).toISOString();

  let page = 1;
  let totalFetched = 0;

  while (true) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&filter[begin_at][gte]=${yesterdayStart}&filter[begin_at][lt]=${dayAfterTomorrowStart}`;

    console.log(`Fetching page ${page}: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`PandaScore error on page ${page}:`, text);
      break;
    }

    const matches = await res.json();

    if (!Array.isArray(matches) || matches.length === 0) {
      console.log("No more matches found, ending.");
      break;
    }

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("status")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError);
        continue;
      }

      if (existing && existing.status === match.status) {
        continue;
      }

      const mapped = {
        match_id,
        esport_type: match.videogame?.name ?? null,
        teams: match.opponents ?? [],
        start_time: match.begin_at ? new Date(match.begin_at).toISOString() : null,
        end_time: match.end_at ? new Date(match.end_at).toISOString() : null,
        tournament_id: match.tournament?.id?.toString() ?? null,
        tournament_name: match.tournament?.name ?? null,
        league_id: match.league?.id?.toString() ?? null,
        league_name: match.league?.name ?? null,
        serie_id: match.serie?.id?.toString() ?? null,
        serie_name: match.serie?.name ?? null,
        status: match.status ?? null,
        match_type: match.match_type ?? null,
        number_of_games: match.number_of_games ?? null,
        raw_data: match ?? null,
        created_at: existing ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        slug: match.slug ?? null,
        draw: match.draw ?? false,
        forfeit: match.forfeit ?? false,
        original_scheduled_at: match.original_scheduled_at
          ? new Date(match.original_scheduled_at).toISOString()
          : null,
        rescheduled: match.rescheduled ?? false,
        detailed_stats: match.detailed_stats ?? false,
        winner_id: match.winner_id?.toString() ?? null,
        winner_type: match.winner_type ?? null,
        videogame_id: match.videogame?.id?.toString() ?? null,
        videogame_name: match.videogame?.name ?? null,
        stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
        stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
        modified_at: match.modified_at ? new Date(match.modified_at).toISOString() : null,
        team_a_player_ids: null,
        team_b_player_ids: null,
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

    if (matches.length < PER_PAGE) {
      break;
    }

    page++;
    await sleep(1000);
  }

  return new Response(JSON.stringify({ status: "done", total: totalFetched }), {
    headers: { "Content-Type": "application/json" },
  });
});
