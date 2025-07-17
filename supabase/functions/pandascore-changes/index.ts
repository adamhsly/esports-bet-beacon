import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY")!;
  const BASE_URL = "https://api.pandascore.co/matches/changes";
  const PER_PAGE = 50;

  // Cache for team player IDs
  const teamCache: Record<string, number[]> = {};

  async function getTeamPlayerIds(teamId: number): Promise<number[]> {
    if (!teamId) return [];

    if (teamCache[teamId]) return teamCache[teamId];

    const res = await fetch(`https://api.pandascore.co/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`Failed to fetch team ${teamId}:`, await res.text());
      return [];
    }

    const data = await res.json();
    const playerIds = (data.players ?? []).map((p: any) => p.id).filter(Boolean);
    teamCache[teamId] = playerIds;
    await sleep(300); // To avoid rate limits
    return playerIds;
  }

  // Helper to get current max page count from API headers
  async function getMaxPage(): Promise<number> {
    const res = await fetch(`${BASE_URL}?per_page=1&page=1`, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });
    if (!res.ok) {
      console.error("Failed to fetch max page:", await res.text());
      return 1; // fallback to 1
    }
    const total = res.headers.get("X-Total");
    if (!total) {
      console.error("X-Total header missing, defaulting max page to 1");
      return 1;
    }
    return Math.ceil(Number(total) / PER_PAGE);
  }

  // Fetch sync state for match_changes
  const { data: syncState, error: syncStateError } = await supabase
    .from("pandascore_sync_state")
    .select("last_page, max_page")
    .eq("id", "match_changes")
    .maybeSingle();

  if (syncStateError) {
    console.error("Failed to fetch sync state:", syncStateError);
  }

  let lastPage = syncState?.last_page ?? 0;
  let maxPage = syncState?.max_page ?? 0;

  // If lastPage >= maxPage or no maxPage known, reset lastPage to 1 and get fresh maxPage
  if (lastPage >= maxPage || maxPage === 0) {
    lastPage = 1;
    maxPage = await getMaxPage();

    // Update max_page in DB
    const { error: maxPageUpdateError } = await supabase
      .from("pandascore_sync_state")
      .upsert({ id: "match_changes", max_page: maxPage }, { onConflict: ["id"] });
    if (maxPageUpdateError) {
      console.error("Failed to update max_page:", maxPageUpdateError);
    }
  } else {
    lastPage++;
  }

  console.log(`Fetching page ${lastPage} of ${maxPage} from match changes endpoint`);

  const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${lastPage}&sort=modified_at`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch changes:", await res.text());
    return new Response(
      JSON.stringify({ status: "error", message: "Failed to fetch changes" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  let changes: any[] = [];
  try {
    changes = await res.json();
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return new Response(
      JSON.stringify({ status: "error", message: "Failed to parse JSON" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  let totalFetched = 0;

  for (const match of changes) {
    const match_id = match.id?.toString();
    if (!match_id) continue;

    // Check if existing match exists to compare modified_at
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

    // Skip if not modified
    if (modifiedLocal && modifiedRemote <= modifiedLocal) continue;

    const teamAId = match.opponents?.[0]?.opponent?.id;
    const teamBId = match.opponents?.[1]?.opponent?.id;

    const teamAPlayerIds = await getTeamPlayerIds(teamAId);
    const teamBPlayerIds = await getTeamPlayerIds(teamBId);

    // Map streams carefully (match.streams_list does not exist in DB schema)
    // Instead map stream_url_1 and stream_url_2 from streams_list if available
    const streamUrl1 = match.streams_list?.[0]?.raw_url ?? null;
    const streamUrl2 = match.streams_list?.[1]?.raw_url ?? null;

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
      stream_url_1: streamUrl1,
      stream_url_2: streamUrl2,
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
      team_a_player_ids: teamAPlayerIds,
      team_b_player_ids: teamBPlayerIds,
      raw_data: match,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      created_at: existing ? undefined : new Date().toISOString(),
    };

    const { error } = await supabase
      .from("pandascore_matches")
      .upsert(mapped, { onConflict: ["match_id"] });

    if (error) {
      console.error(`Failed to upsert match ${match_id}:`, error);
    } else {
      console.log(`Upserted match ${match_id}`);
      totalFetched++;
    }
  }

  // Update sync state with new last_page and max_page
  const { error: syncUpdateError } = await supabase
    .from("pandascore_sync_state")
    .upsert(
      {
        id: "match_changes",
        last_page: lastPage,
        max_page: maxPage,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ["id"] }
    );

  if (syncUpdateError) {
    console.error("Failed to update sync state:", syncUpdateError);
  }

  return new Response(
    JSON.stringify({ status: "done", total: totalFetched, page: lastPage, max_page: maxPage }),
    { headers: { "Content-Type": "application/json" } }
  );
});
