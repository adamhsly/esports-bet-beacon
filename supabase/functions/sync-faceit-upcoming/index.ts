// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** ------------------------ Config & Utils ------------------------ **/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Soft limits (override via env or request body)
const DEFAULT_PAGE_SIZE = Number(Deno.env.get("PAGE_SIZE") ?? 25);
const DEFAULT_MAX_PAGES = Number(Deno.env.get("MAX_PAGES") ?? 4);
const DEFAULT_FETCH_TIMEOUT_MS = Number(Deno.env.get("FETCH_TIMEOUT_MS") ?? 15000);

// Default FACEIT titles (FACEIT-supported). LoL/Valorant aren't FACEIT tourney games.
const DEFAULT_GAMES = (Deno.env.get("FACEIT_DEFAULT_GAMES") ?? "cs2,dota2,r6s,overwatch2")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function convertFaceitTimestamp(timestamp: string | number | null | undefined) {
  if (!timestamp) return null;
  if (typeof timestamp === "string" && timestamp.includes("T")) return timestamp;
  const unixSeconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(unixSeconds as number) || (unixSeconds as number) <= 0) return null;
  return new Date((unixSeconds as number) * 1000).toISOString();
}

function normalizeStatus(status: string | undefined) {
  const s = (status || "").toLowerCase();
  const allowed = ["scheduled", "ready", "upcoming", "configured", "ongoing", "started", "finished"];
  return allowed.includes(s) ? s : "unknown";
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = DEFAULT_FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

type FaceitListResponse<T> = { items?: T[] };

async function paginateList<T>(
  baseUrl: string,
  faceitApiKey: string,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0, page = 0; page < maxPages; offset += pageSize, page++) {
    const u = new URL(baseUrl);
    u.searchParams.set("limit", String(pageSize));
    u.searchParams.set("offset", String(offset));
    const res = await fetchWithTimeout(u.toString(), { headers: { Authorization: `Bearer ${faceitApiKey}` } });
    if (!res.ok) break;
    const json = (await res.json()) as FaceitListResponse<T>;
    const items = json.items ?? [];
    out.push(...items);
    if (items.length < pageSize) break;
  }
  return out;
}

async function getValidGameIds(faceitApiKey: string, desired: string[]) {
  try {
    const url = new URL("https://open.faceit.com/data/v4/games");
    url.searchParams.set("limit", "200");
    const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Bearer ${faceitApiKey}` } });
    if (!res.ok) {
      console.warn("⚠️ /games failed, using desired:", desired);
      return desired;
    }
    const { items = [] } = (await res.json()) as FaceitListResponse<{ game_id: string }>;
    const ids = new Set(items.map(g => g.game_id));
    const filtered = desired.filter(id => ids.has(id));
    if (!filtered.length) {
      console.warn("⚠️ /games returned none of desired ids; using desired raw.");
      return desired;
    }
    console.log("🎮 Valid FACEIT game ids:", filtered);
    return filtered;
  } catch (e) {
    console.warn("⚠️ getValidGameIds error, using desired:", e);
    return desired;
  }
}

// Faceit lists
async function listAllChampionships(game: string, type: "upcoming" | "ongoing" | "past" | "all", key: string, pageSize: number, maxPages: number) {
  const base = new URL("https://open.faceit.com/data/v4/championships");
  base.searchParams.set("game", game);
  base.searchParams.set("type", type);
  return paginateList<any>(base.toString(), key, pageSize, maxPages);
}
async function listChampionshipDetails(championshipId: string, key: string) {
  const url = `https://open.faceit.com/data/v4/championships/${championshipId}`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  return await res.json();
}
async function listChampionshipMatches(championshipId: string, key: string, pageSize: number, maxPages: number) {
  const base = `https://open.faceit.com/data/v4/championships/${championshipId}/matches`;
  return paginateList<any>(base, key, pageSize, maxPages);
}
async function listAllTournaments(game: string, key: string, pageSize: number, maxPages: number) {
  const base = new URL("https://open.faceit.com/data/v4/tournaments");
  base.searchParams.set("game", game);
  return paginateList<any>(base.toString(), key, pageSize, maxPages);
}
async function listTournamentMatches(tournamentId: string, key: string, pageSize: number, maxPages: number) {
  const base = `https://open.faceit.com/data/v4/tournaments/${tournamentId}/matches`;
  return paginateList<any>(base, key, pageSize, maxPages);
}

/** ------------------------ Handler ------------------------ **/

serve(async (req) => {
  try {
    console.log("🟢 Function triggered");
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Parse optional overrides from body
    let body: any = null;
    try { body = await req.json(); } catch { /* no body is fine */ }

    const faceitApiKey = Deno.env.get("FACEIT_API_KEY");
    if (!faceitApiKey) {
      return new Response(JSON.stringify({ success: false, error: "FACEIT_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const pageSize = Number(body?.page_size ?? DEFAULT_PAGE_SIZE);
    const maxPages = Number(body?.max_pages ?? DEFAULT_MAX_PAGES);
    const requestedGames: string[] | null = Array.isArray(body?.games) ? body.games : null;

    const games = await getValidGameIds(faceitApiKey, requestedGames ?? DEFAULT_GAMES);

    // Start log (best-effort)
    let logId: number | null = null;
    {
      const { data, error } = await supabase
        .from("faceit_sync_logs")
        .insert({ sync_type: "upcoming", status: "running" })
        .select("id")
        .single();
      if (error) console.warn("⚠️ Could not insert log:", error);
      logId = data?.id ?? null;
    }

    const allMatches: any[] = [];
    const allMatchStatuses = new Set<string>();

    for (const game of games) {
      // Championships: upcoming + ongoing (finished matches can live inside)
      for (const type of ["ongoing", "upcoming"] as const) {
        console.log(`🎯 Fetching championships for ${game.toUpperCase()} (${type.toUpperCase()})`);
        const championships = await listAllChampionships(game, type, faceitApiKey, pageSize, maxPages);
        console.log(`🏆 Found ${championships.length} championships for ${game} (${type})`);

        for (const championship of championships) {
          const champId = championship?.championship_id;
          if (!champId) continue;

          const [details, matches] = await Promise.all([
            listChampionshipDetails(champId, faceitApiKey),
            listChampionshipMatches(champId, faceitApiKey, pageSize, maxPages),
          ]);

          console.log(`📦 Championship ${champId}: ${matches.length} matches`);

          for (const match of matches) {
            const status = normalizeStatus(match.status);
            if (status === "unknown") {
              console.log(`🚫 Skipping ${match.match_id}: unknown status "${match.status}"`);
              continue;
            }
            // ✅ Include ALL matches (finished, ongoing, upcoming)
            allMatchStatuses.add(status);
            allMatches.push({ match, championshipDetails: details, sourceType: "championship" });
          }
        }
      }

      // Tournaments
      console.log(`🎲 Fetching tournaments for ${game.toUpperCase()}`);
      const tournaments = await listAllTournaments(game, faceitApiKey, pageSize, maxPages);
      console.log(`📦 Found ${tournaments.length} tournaments for ${game}`);

      for (const tournament of tournaments) {
        const tournamentId = tournament?.tournament_id;
        if (!tournamentId) continue;

        const matches = await listTournamentMatches(tournamentId, faceitApiKey, pageSize, maxPages);
        console.log(`🎯 Tournament ${tournamentId}: ${matches.length} matches`);

        for (const match of matches) {
          const status = normalizeStatus(match.status);
          if (status === "unknown") {
            console.log(`🚫 Skipping ${match.match_id}: unknown status "${match.status}"`);
            continue;
          }
          // ✅ Include ALL matches
          allMatchStatuses.add(status);
          allMatches.push({
            match,
            championshipDetails: { ...tournament, stream_url: tournament.stream_url || tournament.faceit_url || null },
            sourceType: "tournament",
          });
        }
      }
    }

    console.log(`📝 Upserting ${allMatches.length} matches...`);
    let added = 0;
    let updated = 0;

    for (const { match, championshipDetails } of allMatches) {
      const status = normalizeStatus(match.status);

      const matchData = {
        match_id: match.match_id,
        game: match.game,
        region: match.region,
        competition_name: match.competition_name,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        status, // store real status, includes "finished"
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
        // NOTE: intentionally not writing source_type to avoid schema mismatch
      };

      const { error } = await supabase
        .from("faceit_matches")
        .upsert(matchData, { onConflict: "match_id", ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Error upserting match ${match.match_id}:`, error);
        continue;
      }

      const { data: existingMatch, error: fetchErr } = await supabase
        .from("faceit_matches")
        .select("created_at, updated_at")
        .eq("match_id", match.match_id)
        .maybeSingle();

      if (fetchErr) {
        console.warn("⚠️ Could not fetch row timestamps:", fetchErr);
        continue;
      }
      if (existingMatch) {
        const createdAt = new Date(existingMatch.created_at).getTime();
        const updatedAt = new Date(existingMatch.updated_at).getTime();
        if (Math.abs(createdAt - updatedAt) < 1000) added++; else updated++;
      }
    }

    // Finish log (best-effort)
    if (logId) {
      const { error } = await supabase
        .from("faceit_sync_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          matches_processed: allMatches.length,
          matches_added: added,
          matches_updated: updated,
        })
        .eq("id", logId);
      if (error) console.warn("⚠️ Could not update log:", error);
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
  } catch (err) {
    console.error("💥 Unhandled error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
