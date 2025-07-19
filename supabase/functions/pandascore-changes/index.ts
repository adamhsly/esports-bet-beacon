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
  const PER_PAGE = 50;

  // Today's UTC range
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const startOfDay = `${yyyy}-${mm}-${dd}T00:00:00Z`;
  const endOfDay = `${yyyy}-${mm}-${dd}T23:59:59Z`;

  const BASE_URL = `https://api.pandascore.co/matches?filter[begin_at]=${startOfDay},${endOfDay}`;

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

  // Determine page range
  const countRes = await fetch(`${BASE_URL}&per_page=1`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  });

  if (!countRes.ok) {
    console.error("Failed to count matches:", await countRes.text());
    return new Response("Error counting matches", { status: 500 });
  }

  const totalMatches = Number(countRes.headers.get("X-Total") ?? "0");
  const maxPage = Math.ceil(totalMatches / PER_PAGE);
  let totalFetched = 0;

  for (let page = 1; page <= maxPage; page++) {
    const url = `${BASE_URL}&per_page=${PER_PAGE}&page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`Error fetching page ${page}:`, await res.text());
      break;
    }

    const matches = await res.json();
    if (!Array.isArray(matches) || matches.length === 0) break;

    for (const match of matches) {
      const match_id = match.id?.toString();
      if (!match_id) continue;

      const { data: existing, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("status, teams")
        .eq("match_id", match_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError);
        continue;
      }

      // Extract team IDs
      const teamAId = match.opponents?.[0]?.opponent?.id;
      const teamBId = match.opponents?.[1]?.opponent?.id;
      const newTeamIds = [teamAId, teamBId].filter(Boolean).sort();

      const existingTeamIds = (existing?.teams ?? [])
        .map((t: any) => t?.opponent?.id)
        .filter(Boolean)
        .sort();

      const statusChanged = existing?.status !== match.status;
      const teamsChanged =
        JSON.stringify(newTeamIds) !== JSON.stringify(existingTeamIds);

      if (!statusChanged && !teamsChanged) {
        continue;
      }

      const teamAPlayerIds = await getTeamPlayerIds(teamAId);
      const teamBPlayerIds = await getTeamPlayerIds(teamBId);

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
        console.error(`Upsert failed for ${match_id}:`, error);
      } else {
        console.log(`Upserted match ${match_id}`);
        totalFetched++;
      }
    }

    await sleep(1000);
  }

  return new Response(JSON.stringify({ status: "done", total: totalFetched }), {
    headers: { "Content-Type": "application/json" },
  });
});
