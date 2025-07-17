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
  const CHANGES_URL = "https://api.pandascore.co/changes";
  const PER_PAGE = 50;
  const FILTER_OBJECT_TYPE = "match";

  // Cache for team player IDs to reduce API calls
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
    await sleep(300);
    return playerIds;
  }

  // Fetch sync state for match_changes paging
  const { data: syncState, error: syncStateError } = await supabase
    .from("pandascore_sync_state")
    .select("last_page, max_page")
    .eq("id", "match_changes")
    .maybeSingle();

  if (syncStateError) {
    console.error("Failed to fetch sync state:", syncStateError);
  }

  let page = syncState?.last_page ?? 1;
  let maxPage = syncState?.max_page ?? 1;

  // Fetch total pages dynamically
  async function fetchMaxPage() {
    const res = await fetch(
      `${CHANGES_URL}?filter[object_type]=${FILTER_OBJECT_TYPE}&per_page=${PER_PAGE}&page=1`,
      { headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` } }
    );
    if (!res.ok) {
      console.error("Failed to fetch max page info:", await res.text());
      return maxPage;
    }
    const totalItems = parseInt(res.headers.get("X-Total") || "0", 10);
    return Math.max(1, Math.ceil(totalItems / PER_PAGE));
  }

  // If maxPage unknown, fetch it now
  if (!syncState?.max_page) {
    maxPage = await fetchMaxPage();
  }

  // If last page exceeds max page (data shrunk?), reset to 1 and refresh maxPage
  if (page > maxPage) {
    page = 1;
    maxPage = await fetchMaxPage();
  }

  console.log(`Starting sync at page ${page} / max page ${maxPage}`);

  // Fetch changes page by page, one page per run
  const changesRes = await fetch(
    `${CHANGES_URL}?filter[object_type]=${FILTER_OBJECT_TYPE}&per_page=${PER_PAGE}&page=${page}`,
    { headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` } }
  );

  if (!changesRes.ok) {
    console.error("Failed to fetch changes:", await changesRes.text());
    return new Response(
      JSON.stringify({ status: "error", message: "Failed to fetch changes" }),
      { status: 500 }
    );
  }

  const changes = await changesRes.json();
  let totalProcessed = 0;

  for (const change of changes) {
    const matchId = change.object_id;
    if (!matchId) continue;

    // Fetch full match data by ID
    const matchRes = await fetch(`https://api.pandascore.co/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!matchRes.ok) {
      console.error(`Failed to fetch full match ${matchId}:`, await matchRes.text());
      continue;
    }

    const match = await matchRes.json();

    // Extract team IDs from opponents
    const teamAId = match.opponents?.[0]?.opponent?.id;
    const teamBId = match.opponents?.[1]?.opponent?.id;

    const teamAPlayerIds = await getTeamPlayerIds(teamAId);
    const teamBPlayerIds = await getTeamPlayerIds(teamBId);

    // Map match fields to your DB schema
    const mapped = {
      match_id: match.id?.toString(),
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
      team_a_player_ids: teamAPlayerIds,
      team_b_player_ids: teamBPlayerIds,
      raw_data: match,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      created_at: undefined, // will auto-set if new on upsert
    };

    // Upsert the match in Supabase
    const { error } = await supabase
      .from("pandascore_matches")
      .upsert(mapped, { onConflict: ["match_id"] });

    if (error) {
      console.error(`Failed to upsert match ${matchId}:`, error);
    } else {
      console.log(`Upserted match ${matchId}`);
      totalProcessed++;
    }
  }

  // Update sync state with new page info and refreshed max page count
  const newPage = page >= maxPage ? 1 : page + 1;
  const refreshedMaxPage = await fetchMaxPage();

  const { error: syncUpdateError } = await supabase
    .from("pandascore_sync_state")
    .upsert(
      {
        id: "match_changes",
        last_page: newPage,
        max_page: refreshedMaxPage,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ["id"] }
    );

  if (syncUpdateError) {
    console.error("Failed to update sync state:", syncUpdateError);
  }

  return new Response(
    JSON.stringify({
      status: "done",
      total_processed: totalProcessed,
      next_page: newPage,
      max_page: refreshedMaxPage,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
