// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function convertFaceitTimestamp(timestamp: string | number | null | undefined) {
  if (!timestamp) return null;
  if (typeof timestamp === "string" && timestamp.includes("T")) return timestamp;
  const unixSeconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(unixSeconds as number) || (unixSeconds as number) <= 0) return null;
  return new Date((unixSeconds as number) * 1000).toISOString();
}

type FaceitListResponse<T> = { items?: T[] };

async function fetchJSON<T>(url: string, faceitApiKey: string): Promise<Response & { json: () => Promise<T> }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${faceitApiKey}` } });
  return res as any;
}

async function getValidGameIds(faceitApiKey: string, desired: string[]) {
  // Discover valid game ids from FACEIT to avoid stale ids like "csgo"
  const url = new URL("https://open.faceit.com/data/v4/games");
  url.searchParams.set("limit", "200");
  const res = await fetchJSON<FaceitListResponse<{ game_id: string }>>(url.toString(), faceitApiKey);
  if (!res.ok) {
    console.warn("⚠️ Failed to fetch /games. Falling back to desired list:", desired);
    return desired;
  }
  const { items = [] } = await res.json();
  const ids = new Set(items.map((g) => g.game_id));
  const finalList = desired.filter((id) => ids.has(id));
  if (finalList.length === 0) {
    console.warn("⚠️ /games returned none of the desired ids; using raw desired list.");
    return desired;
  }
  console.log("🎮 Valid FACEIT game ids:", finalList);
  return finalList;
}

async function paginateList<T>(baseUrl: string, faceitApiKey: string, pageSize = 50, maxPages = 200): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0, page = 0; page < maxPages; offset += pageSize, page++) {
    const u = new URL(baseUrl);
    u.searchParams.set("limit", String(pageSize));
    u.searchParams.set("offset", String(offset));
    const res = await fetchJSON<FaceitListResponse<T>>(u.toString(), faceitApiKey);
    if (!res.ok) break;
    const { items = [] } = await res.json();
    out.push(...items);
    if (items.length < pageSize) break;
  }
  return out;
}

async function listAllChampionships(game: string, type: "upcoming" | "ongoing" | "past" | "all", key: string) {
  const base = new URL("https://open.faceit.com/data/v4/championships");
  base.searchParams.set("game", game);
  base.searchParams.set("type", type);
  return paginateList<any>(base.toString(), key, 50);
}

async function listChampionshipDetails(championshipId: string, key: string) {
  const url = `https://open.faceit.com/data/v4/championships/${championshipId}`;
  const res = await fetchJSON<any>(url, key);
  if (!res.ok) return null;
  return await res.json();
}

async function listChampionshipMatches(championshipId: string, key: string) {
  const base = `https://open.faceit.com/data/v4/championships/${championshipId}/matches`;
  return paginateList<any>(base, key, 50);
}

async function listAllTournaments(game: string, key: string) {
  const base = new URL("https://open.faceit.com/data/v4/tournaments");
  base.searchParams.set("game", game);
  return paginateList<any>(base.toString(), key, 50);
}

async function listTournamentMatches(tournamentId: string, key: string) {
  const base = `https://open.faceit.com/data/v4/tournaments/${tournamentId}/matches`;
  return paginateList<any>(base, key, 50);
}

function normalizeStatus(status: string | undefined) {
  const s = (status || "").toLowerCase();
  const allowed = ["scheduled", "ready", "upcoming", "configured", "ongoing", "started", "finished"];
  return allowed.includes(s) ? s : "unknown";
}

serve(async (req) => {
  console.log("🟢 Function triggered");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const faceitApiKey = Deno.env.get("FACEIT_API_KEY");
  if (!faceitApiKey) return new Response("FACEIT_API_KEY not set", { status: 500 });

  // FACEIT-supported titles. Avoid LoL/Valorant which aren’t FACEIT tournament games.
  const desiredDefault = ["cs2", "dota2", "r6s", "overwatch2"];

  let requestedGames: string[] | null = null;
  try {
    const body = await req.json();
    if (body?.games && Array.isArray(body.games)) {
      requestedGames = body.games;
      console.log("🎮 Using custom games list (will verify against /games):", requestedGames);
    }
  } catch {
    // no body provided; continue with defaults
  }

  const games = await getValidGameIds(faceitApiKey, requestedGames ?? desiredDefault);

  const { data: logEntry } = await supabase
    .from("faceit_sync_logs")
    .insert({ sync_type: "upcoming", status: "running" })
    .select()
    .single();

  const allMatches: any[] = [];
  const allMatchStatuses = new Set<string>();

  for (const game of games) {
    // Championships: upcoming + ongoing (finished matches can appear inside ongoing champs)
    for (const type of ["ongoing", "upcoming"] as const) {
      console.log(`🎯 Fetching championships for ${game.toUpperCase()} (${type.toUpperCase()})`);
      const championships = await listAllChampionships(game, type, faceitApiKey);
      console.log(`🏆 Found ${championships.length} championships for ${game} (${type})`);

      for (const championship of championships) {
        const champId = championship.championship_id;
        if (!champId) continue;

        const [details, matches] = await Promise.all([
          listChampionshipDetails(champId, faceitApiKey),
          listChampionshipMatches(champId, faceitApiKey),
        ]);

        console.log(`📦 Championship ${champId}: ${matches.length} matches`);

        for (const match of matches) {
          const status = normalizeStatus(match.status);
          allMatchStatuses.add(status);
          if (status === "unknown") {
            console.log(`🚫 Skipping ${match.match_id}: unknown status "${match.status}"`);
            continue;
          }

          // ✅ Include ALL matches (finished, ongoing, upcoming)
          allMatches.push({ match, championshipDetails: details, sourceType: "championship" });
        }
      }
    }

    // Tournaments
    console.log(`🎲 Fetching tournaments for ${game.toUpperCase()}`);
    const tournaments = await listAllTournaments(game, faceitApiKey);
    console.log(`📦 Found ${tournaments.length} tournaments for ${game}`);

    for (const tournament of tournaments) {
      const tournamentId = tournament.tournament_id;
      if (!tournamentId) continue;

      const matches = await listTournamentMatches(tournamentId, faceitApiKey);
      console.log(`🎯 Tournament ${tournamentId}: ${matches.length} matches`);

      for (const match of matches) {
        const status = normalizeStatus(match.status);
        allMatchStatuses.add(status);
        if (status === "unknown") {
          console.log(`🚫 Skipping ${match.match_id}: unknown status "${match.status}"`);
          continue;
        }

        // ✅ Include ALL matches (finished, ongoing, upcoming)
        allMatches.push({
          match,
          championshipDetails: {
            ...tournament,
            stream_url: tournament.stream_url || tournament.faceit_url || null,
          },
          sourceType: "tournament",
        });
      }
    }
  }

  console.log(`📝 Upserting ${allMatches.length} matches...`);
  let added = 0;
  let updated = 0;

  for (const { match, championshipDetails, sourceType } of allMatches) {
    const status = normalizeStatus(match.status);

    const matchData = {
      match_id: match.match_id,
      game: match.game,
      region: match.region,
      competition_name: match.competition_name,
      competition_type: match.competition_type,
      organized_by: match.organized_by,
      status, // ⬅️ store true status (finished/ongoing/upcoming/etc.)
      started_at: convertFaceitTimestamp(match.started_at),
      scheduled_at: convertFaceitTimestamp(match.scheduled_at),
      finished_at: convertFaceitTimestamp(match.finished_at),
      configured_at: convertFaceitTimestamp(match.configured_at),
      calculate_elo: match.calculate_elo,
      version: match.version,
      teams: match.teams,
      voting: match.voting || null,
      faceit_data: {
        region: match.region,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        calculate_elo: match.calculate_elo,
      },
      raw_data: match,
      championship_stream_url: championshipDetails?.stream_url || championshipDetails?.url || null,
      championship_raw_data: championshipDetails || null,
      // If you removed this column earlier, also remove the next line:
      source_type: sourceType,
    };

    const { error } = await supabase
      .from("faceit_matches")
      .upsert(matchData, { onConflict: "match_id", ignoreDuplicates: false });

    if (error) {
      console.error(`❌ Error upserting match ${match.match_id}:`, error);
      continue;
    }

    const { data: existingMatch } = await supabase
      .from("faceit_matches")
      .select("created_at, updated_at")
      .eq("match_id", match.match_id)
      .single();

    if (existingMatch) {
      const createdAt = new Date(existingMatch.created_at).getTime();
      const updatedAt = new Date(existingMatch.updated_at).getTime();
      if (Math.abs(createdAt - updatedAt) < 1000) {
        added++;
      } else {
        updated++;
      }
    }
  }

  if (logEntry?.id) {
    await supabase
      .from("faceit_sync_logs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        matches_processed: allMatches.length,
        matches_added: added,
        matches_updated: updated,
      })
      .eq("id", logEntry.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      matches_processed: allMatches.length,
      matches_added: added,
      matches_updated: updated,
      match_statuses: Array.from(allMatchStatuses),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
