// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility to compare teams arrays (opponents)
function teamsAreDifferent(apiTeams: any[], dbTeams: any[]): boolean {
  // Simple check: if lengths differ, definitely changed
  if (!apiTeams || !dbTeams) return true;
  if (apiTeams.length !== dbTeams.length) return true;

  // Compare stringified JSON of each opponent — order matters here
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

  // Calculate date range: yesterday 00:00:00 UTC to day after tomorrow 00:00:00 UTC
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  const dayAfterTomorrowStart = new Date(todayStart);
  dayAfterTomorrowStart.setUTCDate(dayAfterTomorrowStart.getUTCDate() + 2);

  const dateRangeStr = `${yesterdayStart.toISOString().slice(0, 10)},${dayAfterTomorrowStart
    .toISOString()
    .slice(0, 10)}`;

  // Load sync state from Supabase
  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page", "max_page")
    .eq("id", "matches")
    .maybeSingle();

  let lastPage = (syncState?.last_page ?? 0) + 1;
  const maxPage = syncState?.max_page ?? 0;

  // Get total matches count to calculate max page
  const headRes = await fetch(
    `${BASE_URL}?per_page=1&range[scheduled_at]=${dateRangeStr}`,
    {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    }
  );

  if (!headRes.ok) {
    console.error("Failed to fetch total matches count:", await headRes.text());
    return new Response(
      JSON.stringify({ error: "Failed to fetch total matches count" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const totalMatches = Number(headRes.headers.get("X-Total") ?? 0);
  const computedMaxPage = Math.ceil(totalMatches / PER_PAGE);

  console.log(`Total matches: ${totalMatches}, Max page: ${computedMaxPage}`);

  // Update max_page if needed
  if (computedMaxPage !== maxPage) {
    const { error: maxPageError } = await supabase
      .from("pandascore_sync_state")
      .upsert(
        { id: "matches", max_page: computedMaxPage },
        { onConflict: ["id"] }
      );
    if (maxPageError) {
      console.error("Failed to update max_page in sync_state:", maxPageError);
    }
  }

  let totalFetched = 0;

  while (lastPage <= computedMaxPage) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${lastPage}&range[scheduled_at]=${dateRangeStr}`;
    console.log(`Fetching page ${lastPage}: ${url}`);

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

    if (!Array.isArray(matches) || matches.length === 0) {
      console.log("No more matches to process.");
      break;
    }

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      // Fetch existing match by match_id
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

      // Update if status changed OR teams changed
      if (existingStatus === apiStatus && !teamsAreDifferent(apiTeams, existingTeams)) {
        // No relevant change, skip update
        continue;
      }

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
        status: match.status ?? null,
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

    // Update sync state with last processed page
    const { error: syncUpdateError } = await supabase
      .from("pandascore_sync_state")
      .upsert(
        {
          id: "matches",
          last_page: lastPage,
          max_page: computedMaxPage,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: ["id"] }
      );

    if (syncUpdateError) {
      console.error(`❌ Failed to update sync state for page ${lastPage}:`, syncUpdateError);
    }

    lastPage++;
    await sleep(1000);
  }

  // Reset last_page back to 0 for next full sync cycle
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
    console.error("❌ Failed to reset last_page in sync_state:", resetError);
  }

  // --- New: Fetch and update live running matches ---
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

    console.log(`🕹️ ${runningMatches.length} live running matches found.`);

    for (const match of runningMatches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      // Fetch existing match by match_id
      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("id")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking running match ${match_id}:`, fetchError);
        continue;
      }
      if (!existing) {
        // No existing record to update
        continue;
      }

      // Extract scores from match.results if available
      // Structure example: [{team_id:1234, score:1}, ...]
      // We'll just keep full raw_data for now, since free tier is limited
      const updateData = {
        status: match.status ?? null,
        winner_id: match.winner_id?.toString() ?? null,
        winner_type: match.winner_type ?? null,
        raw_data: match,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("pandascore_matches")
        .update(updateData)
        .eq("match_id", match_id);

      if (updateError) {
        console.error(`❌ Failed to update live match ${match_id}:`, updateError);
      } else {
        console.log(`✅ Updated live match ${match_id} with status ${match.status}`);
      }
    }
  }

  await updateLiveRunningMatches();

  return new Response(
    JSON.stringify({
      message: "Sync completed.",
      total_fetched: totalFetched,
      last_page: lastPage - 1,
      max_page: computedMaxPage,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    }
  );
});
