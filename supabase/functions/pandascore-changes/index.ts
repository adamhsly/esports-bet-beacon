import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY");
  const BASE_URL = "https://api.pandascore.co/matches";
  const PER_PAGE = 50;

  if (!PANDA_API_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
  }

  // Get the current sync state
  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page, max_page")
    .eq("id", "matches")
    .maybeSingle();

  let page = (syncState?.last_page ?? 0) + 1;
  let totalFetched = 0;

  // Get total matches available (optional, for logging or max_page logic)
  const testRes = await fetch(`${BASE_URL}?per_page=1`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  });
  const total = testRes.headers.get("X-Total");
  console.log(`Total matches available: ${total}`);

  while (true) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&sort=modified_at`;
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

    if (!Array.isArray(matches) || matches.length === 0) break;

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("modified_at")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError);
        continue;
      }

      const modifiedRemote = new Date(match.modified_at);
      const modifiedLocal = existing?.modified_at ? new Date(existing.modified_at) : null;

      if (modifiedLocal && modifiedRemote <= modifiedLocal) continue;

      const teamAPlayerIds = match.opponents?.[0]?.opponent?.players?.map((p: any) => p.id) ?? [];
      const teamBPlayerIds = match.opponents?.[1]?.opponent?.players?.map((p: any) => p.id) ?? [];

      const mapped = {
        match_id,
        begin_at: match.begin_at,
        end_at: match.end_at,
        name: match.name,
        slug: match.slug,
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
        team_a_player_ids: teamAPlayerIds,
        team_b_player_ids: teamBPlayerIds,
        stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
        stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
        modified_at: match.modified_at,
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
    await new Promise(resolve => setTimeout(resolve, 1000)); // Sleep to respect rate limits
  }

  // After cycling through all pages, reset last_page and max_page to 0
  await supabase
    .from("pandascore_sync_state")
    .upsert(
      {
        id: "matches",
        last_page: 0,
        max_page: 0,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ["id"] }
    );

  return new Response(JSON.stringify({ status: "done", total: totalFetched }), {
    headers: { "Content-Type": "application/json" },
  });
});

  return new Response(JSON.stringify({ status: "done", total: totalFetched }), {
    headers: { "Content-Type": "application/json" },
  });
});
