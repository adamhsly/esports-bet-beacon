// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** ------------------------ Config ------------------------ **/
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PAGE_SIZE = Number(Deno.env.get("PAGE_SIZE") ?? 20);
const DEFAULT_MAX_PAGES = Number(Deno.env.get("MAX_PAGES") ?? 2);
const DEFAULT_FETCH_TIMEOUT_MS = Number(Deno.env.get("FETCH_TIMEOUT_MS") ?? 15000);
const DEFAULT_TIME_BUDGET_MS = Number(Deno.env.get("TIME_BUDGET_MS") ?? 55000);
const DIAGNOSTIC_ENV = (Deno.env.get("DIAGNOSTIC") ?? "") === "1";

// FACEIT titles to try by default; we’ll validate with /games
const DEFAULT_GAMES = (Deno.env.get("FACEIT_DEFAULT_GAMES") ?? "cs2,dota2,r6s,overwatch2")
  .split(",").map(s => s.trim()).filter(Boolean);

/** ------------------------ Utils ------------------------ **/
function convertFaceitTimestamp(timestamp: string | number | null | undefined) {
  if (!timestamp) return null;
  if (typeof timestamp === "string" && timestamp.includes("T")) return timestamp;
  const unixSeconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(unixSeconds as number) || (unixSeconds as number) <= 0) return null;
  return new Date((unixSeconds as number) * 1000).toISOString();
}

function normalizeStatus(status: string | undefined) {
  const s = (status || "").toLowerCase();
  const allowed = ["scheduled","ready","upcoming","configured","ongoing","started","finished","cancelled"];
  return allowed.includes(s) ? s : (s || "unknown");
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = DEFAULT_FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(id); }
}

type FaceitListResponse<T> = { items?: T[] };

async function paginateList<T>(
  baseUrl: string,
  faceitApiKey: string,
  pageSize: number,
  maxPages: number,
  breadcrumbs: string[]
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0, page = 0; page < maxPages; offset += pageSize, page++) {
    const u = new URL(baseUrl);
    u.searchParams.set("limit", String(pageSize));
    u.searchParams.set("offset", String(offset));
    breadcrumbs.push(`HTTP GET ${u.toString()}`);
    const res = await fetchWithTimeout(u.toString(), { headers: { Authorization: `Bearer ${faceitApiKey}` } });
    if (!res.ok) {
      breadcrumbs.push(`HTTP ${res.status} on ${u.toString()}`);
      break;
    }
    const json = (await res.json()) as FaceitListResponse<T>;
    const items = json.items ?? [];
    out.push(...items);
    breadcrumbs.push(`Page ${page} items: ${items.length}`);
    if (items.length < pageSize) break;
  }
  return out;
}

async function getValidGameIds(faceitApiKey: string, desired: string[], breadcrumbs: string[]) {
  try {
    const url = new URL("https://open.faceit.com/data/v4/games");
    url.searchParams.set("limit","200");
    breadcrumbs.push(`HTTP GET ${url.toString()}`);
    const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Bearer ${faceitApiKey}` } });
    if (!res.ok) {
      breadcrumbs.push(`HTTP ${res.status} on /games; using desired list`);
      return desired;
    }
    const { items = [] } = (await res.json()) as FaceitListResponse<{ game_id: string }>;
    const ids = new Set(items.map(g => g.game_id));
    const filtered = desired.filter(id => ids.has(id));
    breadcrumbs.push(`Valid games from /games filter: ${filtered.join(",") || "(empty)"}`);
    return filtered.length ? filtered : desired;
  } catch (e) {
    breadcrumbs.push(`ERR /games ${String(e)}`);
    return desired;
  }
}

async function listAllChampionships(game: string, type: "upcoming"|"ongoing"|"past"|"all",
  key: string, pageSize: number, maxPages: number, breadcrumbs: string[]) {
  const base = new URL("https://open.faceit.com/data/v4/championships");
  base.searchParams.set("game", game);
  base.searchParams.set("type", type);
  return paginateList<any>(base.toString(), key, pageSize, maxPages, breadcrumbs);
}
async function listChampionshipDetails(championshipId: string, key: string, breadcrumbs: string[]) {
  const url = `https://open.faceit.com/data/v4/championships/${championshipId}`;
  breadcrumbs.push(`HTTP GET ${url}`);
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    breadcrumbs.push(`HTTP ${res.status} on ${url}`);
    return null;
  }
  return await res.json();
}
async function listChampionshipMatches(championshipId: string, key: string, pageSize: number, maxPages: number, breadcrumbs: string[]) {
  const base = `https://open.faceit.com/data/v4/championships/${championshipId}/matches`;
  return paginateList<any>(base, key, pageSize, maxPages, breadcrumbs);
}
async function listAllTournaments(game: string, key: string, pageSize: number, maxPages: number, breadcrumbs: string[]) {
  const base = new URL("https://open.faceit.com/data/v4/tournaments");
  base.searchParams.set("game", game);
  return paginateList<any>(base.toString(), key, pageSize, maxPages, breadcrumbs);
}
async function listTournamentMatches(tournamentId: string, key: string, pageSize: number, maxPages: number, breadcrumbs: string[]) {
  const base = `https://open.faceit.com/data/v4/tournaments/${tournamentId}/matches`;
  return paginateList<any>(base, key, pageSize, maxPages, breadcrumbs);
}

/** ------------------------ Handler ------------------------ **/
serve(async (req) => {
  const breadcrumbs: string[] = [];
  const started = Date.now();
  const deadline = started + DEFAULT_TIME_BUDGET_MS;

  try {
    console.log("🟢 Function triggered");
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    let body: any = null;
    try { body = await req.json(); } catch {}
    const DIAG = DIAGNOSTIC_ENV || !!body?.diagnostic;

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

    breadcrumbs.push(`page_size=${pageSize} max_pages=${maxPages} DIAG=${DIAG ? "1" : "0"}`);
    let games = await getValidGameIds(faceitApiKey, requestedGames ?? DEFAULT_GAMES, breadcrumbs);
    if (!games.length) games = ["cs2"];
    breadcrumbs.push(`games=${games.join(",")}`);

    // Start log (best-effort)
    let logId: number | null = null;
    if (!DIAG) {
      const logIns = await supabase
        .from("faceit_sync_logs")
        .insert({ sync_type: "upcoming", status: "running" })
        .select("id")
        .maybeSingle();
      if (logIns.error) breadcrumbs.push(`LOG insert error: ${JSON.stringify(logIns.error)}`);
      logId = logIns.data?.id ?? null;
    } else {
      breadcrumbs.push("DIAG: skipping sync log insert");
    }

    const allMatches: any[] = [];
    const allMatchStatuses = new Set<string>();

    for (const game of games) {
      if (Date.now() > deadline - 5000) {
        breadcrumbs.push("⏳ time budget nearly exhausted (before championships)");
        break;
      }

      for (const type of ["ongoing", "upcoming"] as const) {
        breadcrumbs.push(`list championships ${game}/${type}`);
        const championships = await listAllChampionships(game, type, faceitApiKey, pageSize, maxPages, breadcrumbs);
        breadcrumbs.push(`championships found: ${championships.length}`);

        for (const championship of championships) {
          const champId = championship?.championship_id;
          if (!champId) continue;

          if (Date.now() > deadline - 5000) {
            breadcrumbs.push("⏳ time budget nearly exhausted (inside championships)");
            break;
          }

          const [details, matches] = await Promise.all([
            listChampionshipDetails(champId, faceitApiKey, breadcrumbs),
            listChampionshipMatches(champId, faceitApiKey, pageSize, maxPages, breadcrumbs),
          ]);

          breadcrumbs.push(`champ ${champId} matches: ${matches.length}`);
          for (const match of matches) {
            const status = normalizeStatus(match.status);
            if (status === "unknown") continue;
            allMatchStatuses.add(status);
            allMatches.push({ match, championshipDetails: details, sourceType: "championship" as const });
          }
        }
      }

      if (Date.now() > deadline - 5000) {
        breadcrumbs.push("⏳ time budget nearly exhausted (before tournaments)");
        break;
      }

      breadcrumbs.push(`list tournaments ${game}`);
      const tournaments = await listAllTournaments(game, faceitApiKey, pageSize, maxPages, breadcrumbs);
      breadcrumbs.push(`tournaments found: ${tournaments.length}`);

      for (const tournament of tournaments) {
        const tournamentId = tournament?.tournament_id;
        if (!tournamentId) continue;

        if (Date.now() > deadline - 5000) {
          breadcrumbs.push("⏳ time budget nearly exhausted (inside tournaments)");
          break;
        }

        const matches = await listTournamentMatches(tournamentId, faceitApiKey, pageSize, maxPages, breadcrumbs);
        breadcrumbs.push(`tournament ${tournamentId} matches: ${matches.length}`);
        for (const match of matches) {
          const status = normalizeStatus(match.status);
          if (status === "unknown") continue;
          allMatchStatuses.add(status);
          allMatches.push({
            match,
            championshipDetails: { ...tournament, stream_url: tournament.stream_url || tournament.faceit_url || null },
            sourceType: "tournament" as const,
          });
        }
      }
    }

    breadcrumbs.push(`TOTAL matches collected: ${allMatches.length}`);

    if (DIAG) {
      // Return a tiny preview and breadcrumbs without touching DB
      const preview = allMatches.slice(0, 5).map(m => ({
        match_id: m.match?.match_id,
        status: normalizeStatus(m.match?.status),
        has_teams: !!m.match?.teams,
      }));
      return new Response(JSON.stringify({
        success: true,
        diagnostic: true,
        preview_count: preview.length,
        preview,
        match_statuses: Array.from(allMatchStatuses),
        breadcrumbs,
        elapsed_ms: Date.now() - started,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- UPSERT (row-guarded) ----------
    let added = 0;
    let updated = 0;

    for (const { match, championshipDetails, sourceType } of allMatches) {
      const status = normalizeStatus(match.status);
      const teams = match?.teams ? match.teams : {};  // jsonb NOT NULL
      const game = match?.game || "cs2";

      const matchData = {
        match_id: match.match_id,
        game,
        region: match.region ?? null,
        competition_name: match.competition_name ?? null,
        competition_type: match.competition_type ?? null,
        organized_by: match.organized_by ?? null,
        status, // your schema allows any text
        started_at: convertFaceitTimestamp(match.started_at),
        scheduled_at: convertFaceitTimestamp(match.scheduled_at),
        finished_at: convertFaceitTimestamp(match.finished_at),
        configured_at: convertFaceitTimestamp(match.configured_at),
        calculate_elo: typeof match.calculate_elo === "boolean" ? match.calculate_elo : false,
        version: typeof match.version === "number" ? match.version : null,
        teams, // never null
        voting: match.voting ?? null,
        faceit_data: {
          region: match.region ?? null,
          competition_type: match.competition_type ?? null,
          organized_by: match.organized_by ?? null,
          calculate_elo: typeof match.calculate_elo === "boolean" ? match.calculate_elo : false,
        },
        raw_data: match ?? null,
        championship_stream_url: championshipDetails?.stream_url || championshipDetails?.url || null,
        championship_raw_data: championshipDetails ?? null,
        source_type: sourceType, // 'championship' | 'tournament' or null
      };

      try {
        const { error } = await supabase
          .from("faceit_matches")
          .upsert(matchData, { onConflict: "match_id", ignoreDuplicates: false });

        if (error) {
          // Immediate, informative failure for the tester UI
          return new Response(JSON.stringify({
            success: false,
            stage: "upsert",
            match_id: match.match_id,
            status,
            supabase_error: error,
            breadcrumbs,
          }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: existingMatch, error: fetchErr } = await supabase
          .from("faceit_matches")
          .select("created_at, updated_at")
          .eq("match_id", match.match_id)
          .maybeSingle();

        if (fetchErr) {
          breadcrumbs.push(`WARN fetch timestamps: ${JSON.stringify(fetchErr)}`);
          continue;
        }
        if (existingMatch) {
          const createdAt = new Date(existingMatch.created_at).getTime();
          const updatedAt = new Date(existingMatch.updated_at).getTime();
          if (Math.abs(createdAt - updatedAt) < 1000) added++; else updated++;
        }
      } catch (rowErr) {
        return new Response(JSON.stringify({
          success: false,
          stage: "upsert-throw",
          match_id: match?.match_id,
          error: String(rowErr),
          breadcrumbs,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (Date.now() > deadline - 3000) {
        breadcrumbs.push("⏳ time budget nearly exhausted (during upserts)");
        break;
      }
    }

    if (Date.now() > deadline - 1000) {
      breadcrumbs.push("⏳ time budget exhausted before finishing");
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
      if (error) breadcrumbs.push(`LOG update error: ${JSON.stringify(error)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      matches_processed: allMatches.length,
      matches_added: added,
      matches_updated: updated,
      match_statuses: Array.from(allMatchStatuses),
      breadcrumbs,
      elapsed_ms: Date.now() - started,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      stage: "top-level",
      error: String(err),
      breadcrumbs,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
