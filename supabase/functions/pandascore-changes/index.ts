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

  // Calculate date range: yesterday, today, tomorrow
  const now = new Date();
  const yesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const dayAfterTomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2));
  const dateRangeStr = `${yesterdayStart.toISOString().slice(0, 10)},${dayAfterTomorrowStart.toISOString().slice(0, 10)}`;

  // Get current sync state
  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page, max_page")
    .eq("id", "matches")
    .maybeSingle();

  let lastPage = syncState?.last_page ?? 0;
  let maxPage = syncState?.max_page ?? 0;

  // If lastPage is 0 or exceeds maxPage, reset to 1 to start fresh
  if (lastPage === 0 || (maxPage && lastPage > maxPage)) {
    lastPage = 1;
  }

  let totalFetched = 0;

  // Fetch total count and max page from headers
  const headRes = await fetch(
    `${BASE_URL}?per_page=1&range[begin_at]=${dateRangeStr}`,
    {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    }
  );

  if (!headRes.ok) {
    console.error("Failed to fetch total count:", await headRes.text());
    return new Response(
      JSON.stringify({ error: "Failed to get total matches count" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const totalCount = parseInt(headRes.headers.get("X-Total") ?? "0", 10);
  maxPage = Math.ceil(totalCount / PER_PAGE);
  console.log(`Total matches in date range: ${totalCount}, max pages: ${maxPage}`);

  // Update maxPage in sync state early
  const { error: syncMaxPageError } = await supabase
    .from("pandascore_sync_state")
    .upsert(
      {
        id: "matches",
        max_page: maxPage,
      },
      { onConflict: ["id"] }
    );

  if (syncMaxPageError) {
    console.error("❌ Failed to update max_page in sync state:", syncMaxPageError);
  }

  while (lastPage <= maxPage) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${lastPage}&range[begin_at]=${dateRangeStr}`;
    console.log(`Fetching page ${lastPage}: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`PandaScore error on page ${lastPage}:`, await res.text());
      break;
    }

    let matches: any[];
    try {
      matches = await res.json();
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

      // Only check 'status' field for changes
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
        // No status change, skip update
        continue;
      }

      // Prepare mapped data
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
        modified_at: match.modified_at,
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

    // Update sync state with last page and timestamp
    const { error: syncUpdateError } = await supabase
      .from("pandascore_sync_state")
      .upsert(
        {
          id: "matches",
          last_page: lastPage,
          last_synced_at: new Date().toISOString(),
          max_page: maxPage,
        },
        { onConflict: ["id"] }
      );

    if (syncUpdateError) {
      console.error(`❌ Failed to update sync state for page ${lastPage}:`, syncUpdateError);
    }

    lastPage++;
    await sleep(1000); // Rate limit friendly delay
  }

  // Reset last_page after full sync
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
    console.error("❌ Failed to reset last_page after sync:", resetError);
  }

  return new Response(
    JSON.stringify({ status: "done", total_matches_processed: totalFetched }),
    { headers: { "Content-Type": "application/json" } }
  );
});
