// Smart trivia board generation engine — Tier S/A only.
//
// Pipeline:
//   1. Fetch the recognizable universe for this esport:
//        • Top-tier teams (Tier S/A appearance count >= 3)
//        • Top-tier tournaments / leagues (Tier S/A)
//        • Players that have played in any Tier S/A match
//   2. Build the candidate clue pool from approved (active) clues filtered to
//      that universe + auto-derived team/tournament/league/nationality clues.
//   3. Filter overused / recently-used clues (per-user and global).
//   4. Brute-force assemble many candidate boards under diversity caps.
//   5. Validate each candidate cell has >=2 distinct top-tier player answers.
//   6. Score boards on solvability, difficulty balance, diversity, freshness,
//      similarity penalty AND recognition. Best score wins.
//   7. Publish boards above QUALITY_THRESHOLD; log rejections; if every
//      candidate fails, fall back to the best previously published board
//      the user hasn't seen lately.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClueType = "team" | "nationality" | "tournament" | "league" | "role" | "attribute" | "faced";
type Clue = { type: ClueType; value: string; label: string };

const NATIONALITY_LABELS: Record<string, string> = {
  US: "USA", RU: "Russia", BR: "Brazil", SE: "Sweden", CN: "China",
  UA: "Ukraine", AU: "Australia", PL: "Poland", DK: "Denmark", FI: "Finland",
  AR: "Argentina", DE: "Germany", FR: "France", GB: "UK", KR: "South Korea",
  CA: "Canada", NO: "Norway", NL: "Netherlands", ES: "Spain", TR: "Turkey",
  CZ: "Czechia", IT: "Italy", BE: "Belgium", PT: "Portugal", JP: "Japan",
};

// ---- Tunables ----------------------------------------------------------------
const TYPE_CAPS: Record<ClueType, number> = {
  team: 3, nationality: 3, role: 1, tournament: 3, league: 3, attribute: 2, faced: 2,
};
const USER_FRESHNESS_WINDOW = 10;
const GLOBAL_COOLDOWN_MS = 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_MAX = 6;
const MIN_ANSWERS_PER_CELL = 1;
const QUALITY_THRESHOLD = 0.55;
const MAX_CANDIDATES = 24;

// Tier-S/A recognition tunables
const MIN_TEAM_APPEARANCES = 3;          // exclude one-off appearances
const MAX_TOP_TEAMS = 24;                // cap derived team clues
const MAX_TOP_TOURNAMENTS = 12;
const MAX_TOP_LEAGUES = 10;

// ---- helpers ----------------------------------------------------------------
const clueKey = (c: Clue) => `${c.type}:${c.value}`;
const shuffle = <T,>(arr: T[]) =>
  arr.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

function structureSignature(clues: Clue[]) {
  const counts = clueTypeCounts(clues);
  return Object.keys(counts).sort().map((k) => `${k}:${counts[k]}`).join(",");
}
function clueTypeCounts(clues: Clue[]) {
  const counts: Record<string, number> = {};
  for (const c of clues) counts[c.type] = (counts[c.type] ?? 0) + 1;
  return counts;
}
async function fingerprintFromClues(rows: Clue[], cols: Clue[]) {
  const sides = [rows.map(clueKey).sort().join("|"), cols.map(clueKey).sort().join("|")]
    .sort().join("||");
  const buf = new TextEncoder().encode(sides);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function passesDiversity(rows: Clue[], cols: Clue[]) {
  const counts = clueTypeCounts([...rows, ...cols]);
  for (const [t, cap] of Object.entries(TYPE_CAPS)) {
    if ((counts[t] ?? 0) > cap) return false;
  }
  return Object.keys(counts).length >= 2;
}

// ---- handler ----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  const log = (stage: string, data: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ rid: requestId, t: Date.now() - t0, stage, ...data }));
  };
  // Snapshot of counts so far — included in every fallback/error response so the
  // UI gets a useful picture even without log access.
  const snapshot: Record<string, unknown> = { requestId };

  try {
    const { esport, templateId, userId, bakeMode } = await req.json().catch(() => ({}));
    log("request", { esport, templateId, userId, bakeMode });
    if (!esport || typeof esport !== "string") {
      log("bad_request", { reason: "esport_missing" });
      return new Response(JSON.stringify({ error: "esport required", requestId }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    snapshot.esport = esport;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // -------- 1) Saved template short-circuit --------
    if (templateId && typeof templateId === "string") {
      log("template_lookup", { templateId });
      const board = await hydrateTemplate(supabase, templateId);
      if (board) {
        const fingerprint = await fingerprintFromClues(board.rows, board.cols);
        await registerBoardUse(supabase, fingerprint, esport, board.rows, board.cols, userId);
        await supabase.rpc("trivia_register_clue_use", {
          _clue_keys: [...board.rows, ...board.cols].map(clueKey),
          _esport: esport,
        });
        log("template_hit", { fingerprint });
        return json({ rowClues: board.rows, colClues: board.cols, fingerprint, source: "template", requestId });
      }
      log("template_miss", { templateId });
    }

    // -------- 2) Fetch the Tier S/A recognition universe --------
    const [topTeamsRes, topTourRes] = await Promise.all([
      supabase.rpc("trivia_get_top_tier_teams", {
        _esport: esport, _min_appearances: MIN_TEAM_APPEARANCES,
      }),
      supabase.rpc("trivia_get_top_tier_tournaments", { _esport: esport }),
    ]);
    log("top_tier_rpcs", {
      topTeamsCount: topTeamsRes.data?.length ?? 0,
      topTeamsError: topTeamsRes.error?.message ?? null,
      topToursCount: topTourRes.data?.length ?? 0,
      topToursError: topTourRes.error?.message ?? null,
      topTeamSample: (topTeamsRes.data ?? []).slice(0, 3),
    });
    const topTeams: Array<{ team_id: string; team_name: string; appearances: number; best_tier: string }> =
      topTeamsRes.data ?? [];
    const topTournaments: Array<{ tournament_id: string; tournament_name: string; league_id: string; league_name: string; tier: string }> =
      topTourRes.data ?? [];
    snapshot.topTeamsCount = topTeams.length;
    snapshot.topTournamentsCount = topTournaments.length;
    snapshot.topTeamsError = topTeamsRes.error?.message ?? null;
    snapshot.topToursError = topTourRes.error?.message ?? null;

    if (topTeams.length < 4) {
      // Not enough Tier S/A coverage to make a recognizable board — fall back.
      return await fallbackBoard(supabase, esport, userId, "no_top_tier_coverage", log, snapshot);
    }

    const topTeamIds = new Set(topTeams.map((t) => t.team_id));
    const topTournamentIds = new Set(topTournaments.map((t) => t.tournament_id));
    const topLeagueIds = new Set(topTournaments.map((t) => t.league_id).filter(Boolean));
    const teamRecognition = new Map(topTeams.map((t) => [t.team_id, t.appearances]));

    // -------- 3) Approved clues, filtered to recognizable universe --------
    const { data: approvedRaw, error: approvedErr } = await supabase
      .from("trivia_clues")
      .select("clue_type,clue_value,label,is_active")
      .eq("esport", esport).eq("is_active", true);
    log("approved_clues", {
      raw: approvedRaw?.length ?? 0,
      error: approvedErr?.message ?? null,
    });
    const approvedClues: Clue[] = ((approvedRaw ?? []) as any[])
      .map((c) => ({ type: c.clue_type, value: c.clue_value, label: c.label }))
      .filter((c) => {
        if (c.type === "team") return topTeamIds.has(c.value);
        if (c.type === "tournament") return topTournamentIds.has(c.value);
        if (c.type === "league") return topLeagueIds.has(c.value);
        return true;
      });
    log("approved_clues_filtered", {
      kept: approvedClues.length,
      byType: approvedClues.reduce((acc, c) => { acc[c.type] = (acc[c.type] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    });
    snapshot.approvedRaw = approvedRaw?.length ?? 0;
    snapshot.approvedKept = approvedClues.length;

    // -------- 4) Players: only those with Tier S/A appearances --------
    // Paginate to bypass PostgREST's default 1000-row cap.
    const playerPage = 1000;
    const allPlayers: Array<{
      id: number | string; name: string; nationality: string;
      current_team_id: number | string | null; current_team_name: string | null;
    }> = [];
    let playersErr: any = null;
    for (let from = 0; from < 10000; from += playerPage) {
      const { data: page, error } = await supabase
        .from("pandascore_players_master")
        .select("id,name,nationality,current_team_id,current_team_name")
        .eq("active", true).eq("videogame_name", esport)
        .not("nationality", "is", null)
        .range(from, from + playerPage - 1);
      if (error) { playersErr = error; break; }
      const rows = (page ?? []) as typeof allPlayers;
      allPlayers.push(...rows);
      if (rows.length < playerPage) break;
    }
    log("players_query", {
      count: allPlayers.length,
      error: playersErr?.message ?? null,
    });
    if (playersErr) throw playersErr;
    const players = allPlayers;
    snapshot.playersCount = players.length;
    if (players.length < 30) {
      log("early_return", { reason: "not_enough_players", count: players.length });
      return json({ error: "Not enough players for this esport", requestId, snapshot }, 400);
    }

    // Resolve per-player top-tier history in batches (RPC accepts text[])
    const playerIdStrings = players.map((p) => String(p.id));
    const historyByPlayer = new Map<string, { teams: Set<string>; tournaments: Set<string>; leagues: Set<string> }>();
    const BATCH = 500;
    let totalHistRows = 0;
    let firstHistError: string | null = null;
    for (let i = 0; i < playerIdStrings.length; i += BATCH) {
      const slice = playerIdStrings.slice(i, i + BATCH);
      const { data: hist, error: histErr } = await supabase.rpc("trivia_player_top_tier_match", {
        _esport: esport, _player_ids: slice,
      });
      if (histErr && !firstHistError) firstHistError = histErr.message;
      const rowsCount = (hist ?? []).length;
      totalHistRows += rowsCount;
      log("player_history_batch", {
        batch: i / BATCH, sliceSize: slice.length, rows: rowsCount,
        error: histErr?.message ?? null,
      });
      for (const row of (hist ?? []) as any[]) {
        const pid = String(row.player_id);
        let bucket = historyByPlayer.get(pid);
        if (!bucket) {
          bucket = { teams: new Set(), tournaments: new Set(), leagues: new Set() };
          historyByPlayer.set(pid, bucket);
        }
        if (row.team_id && topTeamIds.has(String(row.team_id))) bucket.teams.add(String(row.team_id));
        if (row.tournament_id && topTournamentIds.has(String(row.tournament_id))) bucket.tournaments.add(String(row.tournament_id));
        if (row.league_id && topLeagueIds.has(String(row.league_id))) bucket.leagues.add(String(row.league_id));
      }
    }
    log("player_history_total", {
      historyRows: totalHistRows,
      uniquePlayers: historyByPlayer.size,
      firstError: firstHistError,
    });
    snapshot.historyRows = totalHistRows;
    snapshot.playersWithHistory = historyByPlayer.size;
    snapshot.firstHistError = firstHistError;

    const recognizablePlayers = players
      .filter((p) => historyByPlayer.has(String(p.id)))
      .map((p) => ({
        id: String(p.id),
        nation: p.nationality,
        history: historyByPlayer.get(String(p.id))!,
      }));
    log("recognizable_players", { count: recognizablePlayers.length });
    snapshot.recognizablePlayers = recognizablePlayers.length;

    if (recognizablePlayers.length < 30) {
      return await fallbackBoard(supabase, esport, userId, "insufficient_top_tier_players", log, snapshot);
    }

    // -------- 5) Derived clues from the recognition universe --------
    const derivedTeams: Clue[] = topTeams
      .slice(0, MAX_TOP_TEAMS)
      .map((t) => ({ type: "team", value: t.team_id, label: t.team_name }));

    // Top tournaments — group by tournament_id but prefer league name if the
    // tournament looks generic ("Playoffs", "Group Stage").
    const seenTour = new Set<string>();
    const derivedTournaments: Clue[] = [];
    for (const t of topTournaments) {
      if (seenTour.has(t.tournament_id)) continue;
      seenTour.add(t.tournament_id);
      const generic = /^(playoffs?|group [a-z]|regular season|main event|qualifier)/i;
      const label = generic.test(t.tournament_name)
        ? `${t.league_name ?? t.tournament_name} ${t.tournament_name}`
        : t.tournament_name;
      derivedTournaments.push({ type: "tournament", value: t.tournament_id, label });
      if (derivedTournaments.length >= MAX_TOP_TOURNAMENTS) break;
    }

    // Top leagues
    const leagueLabel = new Map<string, string>();
    for (const t of topTournaments) {
      if (t.league_id && t.league_name && !leagueLabel.has(t.league_id)) {
        leagueLabel.set(t.league_id, t.league_name);
      }
    }
    const derivedLeagues: Clue[] = [...leagueLabel.entries()]
      .slice(0, MAX_TOP_LEAGUES)
      .map(([id, name]) => ({ type: "league", value: id, label: name }));

    // Nationalities — restrict to those represented by recognizable players
    const nationCount = new Map<string, number>();
    for (const p of recognizablePlayers) {
      nationCount.set(p.nation, (nationCount.get(p.nation) ?? 0) + 1);
    }
    const derivedNations: Clue[] = [...nationCount.entries()]
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([code]) => ({
        type: "nationality", value: code, label: NATIONALITY_LABELS[code] ?? code,
      }));

    log("derived_clues", {
      teams: derivedTeams.length,
      tournaments: derivedTournaments.length,
      leagues: derivedLeagues.length,
      nations: derivedNations.length,
    });

    // Merge approved + derived (approved labels take precedence on the same key)
    const poolMap = new Map<string, Clue>();
    for (const c of [...derivedTeams, ...derivedTournaments, ...derivedLeagues, ...derivedNations]) {
      poolMap.set(clueKey(c), c);
    }
    for (const c of approvedClues) poolMap.set(clueKey(c), c);
    log("pool_merged", { size: poolMap.size });

    // -------- 6) Apply usage filters --------
    const cluesArr = [...poolMap.values()];
    const keys = cluesArr.map(clueKey);
    const { data: usage, error: usageErr } = await supabase
      .from("trivia_clue_usage")
      .select("clue_key,times_used,last_used_at")
      .in("clue_key", keys);
    log("usage_query", { count: usage?.length ?? 0, error: usageErr?.message ?? null });
    const usageByKey = new Map<string, { times: number; last: number }>();
    for (const u of (usage ?? []) as any[]) {
      usageByKey.set(u.clue_key, {
        times: u.times_used ?? 0,
        last: u.last_used_at ? new Date(u.last_used_at).getTime() : 0,
      });
    }
    const cutoff = Date.now() - CLUE_OVERUSE_RECENT_WINDOW_MS;
    const filteredClues = cluesArr.filter((c) => {
      const u = usageByKey.get(clueKey(c));
      if (!u) return true;
      if (u.last >= cutoff && u.times >= CLUE_OVERUSE_RECENT_MAX) return false;
      return true;
    });
    log("filtered_clues", {
      kept: filteredClues.length,
      byType: filteredClues.reduce((acc, c) => { acc[c.type] = (acc[c.type] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    });
    snapshot.poolSize = poolMap.size;
    snapshot.filteredClues = filteredClues.length;

    if (filteredClues.length < 6) {
      return await fallbackBoard(supabase, esport, userId, "insufficient_pool_after_filter", log, snapshot);
    }

    // -------- 7) Freshness data --------
    const recentFingerprints = new Set<string>();
    const recentStructures = new Map<string, number>();
    if (userId && !bakeMode) {
      const { data: recent } = await supabase.rpc("trivia_recent_user_fingerprints", {
        _user_id: userId, _esport: esport, _limit: USER_FRESHNESS_WINDOW,
      });
      for (const r of (recent ?? []) as any[]) {
        recentFingerprints.add(r.fingerprint);
        if (r.structure_signature) {
          recentStructures.set(r.structure_signature,
            (recentStructures.get(r.structure_signature) ?? 0) + 1);
        }
      }
    }
    const cooldownCutoff = new Date(Date.now() - GLOBAL_COOLDOWN_MS).toISOString();
    const hotQuery = supabase
      .from("trivia_board_fingerprints")
      .select("fingerprint")
      .eq("esport", esport)
      .limit(1000);
    const { data: hotBoards } = bakeMode
      ? await hotQuery.eq("published", true)
      : await hotQuery.gte("last_used_at", cooldownCutoff);
    const globallyHot = new Set((hotBoards ?? []).map((b: any) => b.fingerprint));

    // -------- 8) Validity index (Tier S/A only) --------
    const satisfies = (c: Clue, p: typeof recognizablePlayers[number]) => {
      switch (c.type) {
        case "team":        return p.history.teams.has(c.value);
        case "faced":       return p.history.opponents?.has(c.value) ?? false;
        case "tournament":  return p.history.tournaments.has(c.value);
        case "league":      return p.history.leagues.has(c.value);
        case "nationality": return p.nation === c.value;
        default: return false; // role/attribute can't be derived from history
      }
    };

    const checkable = filteredClues.filter((c) =>
      ["team", "faced", "tournament", "league", "nationality"].includes(c.type),
    );
    log("checkable", {
      total: checkable.length,
      teams: checkable.filter((c) => c.type === "team").length,
      tournaments: checkable.filter((c) => c.type === "tournament").length,
      leagues: checkable.filter((c) => c.type === "league").length,
      nations: checkable.filter((c) => c.type === "nationality").length,
    });
    snapshot.checkable = checkable.length;
    if (checkable.length < 6) {
      return await fallbackBoard(supabase, esport, userId, "checkable_pool_too_small", log, snapshot);
    }

    // Pre-index clue -> satisfying player ids once. The previous path scanned
    // every recognizable player for every candidate cell, which exhausted Edge
    // CPU before any board could be persisted.
    const answerSets = new Map<string, Set<string>>();
    for (const c of checkable) {
      const ids = new Set<string>();
      for (const p of recognizablePlayers) {
        if (satisfies(c, p)) ids.add(p.id);
      }
      answerSets.set(clueKey(c), ids);
    }
    const answerSetSizes = [...answerSets.values()].map((s) => s.size);
    log("answer_index", {
      clues: answerSets.size,
      minAnswers: Math.min(...answerSetSizes),
      maxAnswers: Math.max(...answerSetSizes),
    });

    const intersectionMemo = new Map<string, number>();
    const intersectionAnswers = (a: Clue, b: Clue): number => {
      if (a.type === b.type && a.value === b.value) return 0;
      const ak = clueKey(a);
      const bk = clueKey(b);
      const memoKey = ak < bk ? `${ak}||${bk}` : `${bk}||${ak}`;
      const cached = intersectionMemo.get(memoKey);
      if (cached !== undefined) return cached;
      const aSet = answerSets.get(ak);
      const bSet = answerSets.get(bk);
      if (!aSet || !bSet) return 0;
      let n = 0;
      const [small, large] = aSet.size <= bSet.size ? [aSet, bSet] : [bSet, aSet];
      for (const id of small) if (large.has(id)) n++;
      intersectionMemo.set(memoKey, n);
      return n;
    };

    // -------- 9) Brute-force candidate boards --------
    type Candidate = {
      rows: Clue[]; cols: Clue[]; fingerprint: string;
      cellAnswers: number[][]; sig: string;
    };
    const candidates: Candidate[] = [];
    const candidateFingerprints = new Set<string>();
    const pickThree = (pool: Clue[], blocked = new Set<string>()): Clue[] | null => {
      const out: Clue[] = [];
      const used = new Set(blocked);
      for (const c of shuffle(pool)) {
        const k = clueKey(c);
        if (used.has(k)) continue;
        used.add(k);
        out.push(c);
        if (out.length === 3) return out;
      }
      return null;
    };
    const addCandidate = async (rows: Clue[], cols: Clue[]) => {
      if (candidates.length >= MAX_CANDIDATES) return;
      const keys = [...rows, ...cols].map(clueKey);
      if (new Set(keys).size !== 6 || !passesDiversity(rows, cols)) return;

      const cellAnswers: number[][] = [[], [], []].map(() => []);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const n = intersectionAnswers(rows[i], cols[j]);
          if (n < MIN_ANSWERS_PER_CELL) return;
          cellAnswers[i][j] = n;
        }
      }

      const fp = await fingerprintFromClues(rows, cols);
      if (recentFingerprints.has(fp) || candidateFingerprints.has(fp)) return;
      candidateFingerprints.add(fp);
      candidates.push({
        rows, cols, fingerprint: fp, cellAnswers,
        sig: structureSignature([...rows, ...cols]),
      });
    };

    const teamPool = checkable.filter((c) => c.type === "team");
    const nationPool = checkable.filter((c) => c.type === "nationality");
    const otherPool = checkable.filter((c) => c.type !== "team");

    // Deterministic team × nationality boards first. This is the most readable
    // format and avoids the previous exhaustive six-clue nested search.
    const topNations = nationPool
      .sort((a, b) => (answerSets.get(clueKey(b))?.size ?? 0) - (answerSets.get(clueKey(a))?.size ?? 0))
      .slice(0, 10);
    for (let a = 0; a < topNations.length && candidates.length < MAX_CANDIDATES; a++) {
      for (let b = a + 1; b < topNations.length && candidates.length < MAX_CANDIDATES; b++) {
        for (let c = b + 1; c < topNations.length && candidates.length < MAX_CANDIDATES; c++) {
          const cols = [topNations[a], topNations[b], topNations[c]];
          const viableTeams = shuffle(teamPool.filter((team) =>
            cols.every((nation) => intersectionAnswers(team, nation) >= MIN_ANSWERS_PER_CELL),
          )).slice(0, 9);
          for (let t = 0; t + 2 < viableTeams.length && candidates.length < MAX_CANDIDATES; t += 3) {
            await addCandidate([viableTeams[t], viableTeams[t + 1], viableTeams[t + 2]], cols);
          }
        }
      }
    }

    // Small random sampler for extra variety without burning CPU.
    const layouts: Array<[Clue[], Clue[]]> = [
      [teamPool, otherPool],
      [otherPool, teamPool],
      [checkable, checkable],
    ];
    for (const [rowSrc, colSrc] of layouts) {
      for (let attempt = 0; attempt < 1500 && candidates.length < MAX_CANDIDATES; attempt++) {
        const rows = pickThree(rowSrc);
        if (!rows) continue;
        const cols = pickThree(colSrc, new Set(rows.map(clueKey)));
        if (!cols) continue;
        await addCandidate(rows, cols);
      }
    }
    log("candidates", { count: candidates.length });
    snapshot.candidates = candidates.length;

    if (candidates.length === 0) {
      return await fallbackBoard(supabase, esport, userId, "no_valid_candidates", log, snapshot);
    }

    // -------- 10) Score & pick --------
    const maxTeamRecognition = Math.max(1, ...topTeams.map((t) => t.appearances));
    const recognitionFor = (c: Clue): number => {
      if (c.type === "team") {
        const a = teamRecognition.get(c.value) ?? 0;
        return Math.min(1, a / maxTeamRecognition);
      }
      if (c.type === "tournament" || c.type === "league") return 0.85; // by definition Tier S/A
      if (c.type === "nationality") return 0.6;
      return 0.4;
    };

    const scored = candidates.map((c) => {
      const all = [...c.rows, ...c.cols];
      const flat = c.cellAnswers.flat();
      const avgAns = flat.reduce((a, b) => a + b, 0) / 9;
      const solvability = Math.min(1, avgAns / 6);

      const max = Math.max(...flat), min = Math.min(...flat);
      const spread = max === 0 ? 0 : (max - min) / max;
      const difficulty = 1 - Math.min(1, spread);

      const distinctTypes = new Set(all.map((x) => x.type)).size;
      const diversity = Math.min(1, distinctTypes / 4);

      const seenStructure = recentStructures.get(c.sig) ?? 0;
      const fresh = Math.max(0, 1 - seenStructure * 0.25 - (globallyHot.has(c.fingerprint) ? 0.3 : 0));
      const similarityPenalty = Math.min(0.4, seenStructure * 0.15);

      const recognition = all.reduce((a, x) => a + recognitionFor(x), 0) / all.length;

      const quality =
        solvability * 0.25 +
        difficulty  * 0.15 +
        diversity   * 0.20 +
        fresh       * 0.20 +
        recognition * 0.20 -
        similarityPenalty;

      return {
        ...c,
        scores: { solvability, difficulty, diversity, fresh, recognition, quality },
      };
    }).sort((a, b) => b.scores.quality - a.scores.quality);

    const best = scored[0];

    log("best_candidate", { quality: best.scores.quality, threshold: QUALITY_THRESHOLD, scores: best.scores });
    snapshot.bestQuality = best.scores.quality;

    // -------- 11) Publish or reject --------
    if (best.scores.quality < QUALITY_THRESHOLD) {
      await supabase.rpc("trivia_log_board_rejection", {
        _esport: esport,
        _fingerprint: best.fingerprint,
        _reason: "below_quality_threshold",
        _quality: best.scores.quality,
        _details: best.scores,
      });
      return await fallbackBoard(supabase, esport, userId, "quality_threshold", log, snapshot);
    }

    await registerBoardUse(supabase, best.fingerprint, esport, best.rows, best.cols, userId);
    await supabase.rpc("trivia_finalize_board_quality", {
      _fingerprint: best.fingerprint,
      _quality: best.scores.quality,
      _solvability: best.scores.solvability,
      _difficulty: best.scores.difficulty,
      _diversity: best.scores.diversity,
      _freshness: best.scores.fresh,
      _published: true,
    });
    // Persist recognition score + per-clue labels so the pre-baked pool can
    // serve boards instantly without re-resolving derived team/tournament names.
    const clueLabels: Record<string, string> = {};
    for (const c of [...best.rows, ...best.cols]) clueLabels[clueKey(c)] = c.label;
    await supabase.from("trivia_board_fingerprints")
      .update({
        recognition_score: best.scores.recognition,
        min_clue_tier: "a",
        clue_labels: clueLabels,
      })
      .eq("fingerprint", best.fingerprint);

    await supabase.rpc("trivia_register_clue_use", {
      _clue_keys: [...best.rows, ...best.cols].map(clueKey),
      _esport: esport,
    });

    log("success", { fingerprint: best.fingerprint, quality: best.scores.quality });
    return json({
      rowClues: best.rows,
      colClues: best.cols,
      fingerprint: best.fingerprint,
      quality: best.scores.quality,
      recognition: best.scores.recognition,
      source: "generated",
      requestId,
    });
  } catch (e) {
    const err = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error(JSON.stringify({ rid: requestId, stage: "fatal", error: err }));
    return json({ error: err, requestId, snapshot }, 500);
  }
});

// ---- helpers below ----------------------------------------------------------
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hydrateTemplate(supabase: any, templateId: string) {
  const { data: tpl } = await supabase
    .from("trivia_grid_templates")
    .select("row_clue_ids,col_clue_ids,is_active")
    .eq("id", templateId).maybeSingle();
  if (!tpl || !tpl.is_active) return null;
  const ids = [...tpl.row_clue_ids, ...tpl.col_clue_ids];
  const { data: clues } = await supabase
    .from("trivia_clues").select("id,label,clue_type,clue_value").in("id", ids);
  const byId = new Map((clues ?? []).map((c: any) => [c.id, c]));
  const toClue = (id: string): Clue | null => {
    const c: any = byId.get(id);
    return c ? { type: c.clue_type, value: c.clue_value, label: c.label } : null;
  };
  const rows = tpl.row_clue_ids.map(toClue).filter(Boolean) as Clue[];
  const cols = tpl.col_clue_ids.map(toClue).filter(Boolean) as Clue[];
  if (rows.length !== 3 || cols.length !== 3) return null;
  return { rows, cols };
}

async function registerBoardUse(
  supabase: any, fingerprint: string, esport: string,
  rows: Clue[], cols: Clue[], userId: string | undefined,
) {
  const all = [...rows, ...cols];
  await supabase.rpc("trivia_register_board_use", {
    _fingerprint: fingerprint,
    _esport: esport,
    _structure_signature: structureSignature(all),
    _clue_type_counts: clueTypeCounts(all),
    _row_clue_keys: rows.map(clueKey),
    _col_clue_keys: cols.map(clueKey),
    _user_id: userId ?? null,
  });
}

async function fallbackBoard(
  supabase: any, esport: string, userId: string | undefined, reason: string,
  log?: (stage: string, data?: Record<string, unknown>) => void,
  snapshot?: Record<string, unknown>,
) {
  log?.("fallback_attempt", { reason });
  const { data: top, error: topErr } = await supabase.rpc("trivia_top_boards", {
    _esport: esport, _limit: 25,
  });
  log?.("fallback_top_boards", { count: top?.length ?? 0, error: topErr?.message ?? null });
  if (snapshot) {
    snapshot.fallbackReason = reason;
    snapshot.fallbackTopBoards = top?.length ?? 0;
    snapshot.fallbackTopBoardsError = topErr?.message ?? null;
  }
  if (!top || top.length === 0) {
    return json({
      error: `Could not generate a board (${reason}) and no fallback exists`,
      requestId: snapshot?.requestId,
      reason,
      snapshot,
    }, 500);
  }
  let recentSet = new Set<string>();
  if (userId) {
    const { data: recent } = await supabase.rpc("trivia_recent_user_fingerprints", {
      _user_id: userId, _esport: esport, _limit: USER_FRESHNESS_WINDOW,
    });
    recentSet = new Set((recent ?? []).map((r: any) => r.fingerprint));
  }
  const pick = (top as any[]).find((b) => !recentSet.has(b.fingerprint)) ?? top[0];

  const allKeys: string[] = [...pick.row_clue_keys, ...pick.col_clue_keys];
  const { data: lib } = await supabase
    .from("trivia_clues").select("clue_type,clue_value,label")
    .eq("esport", esport).in("clue_value", allKeys.map((k: string) => k.split(":")[1]));
  const labelByKey = new Map<string, string>();
  for (const c of (lib ?? []) as any[]) {
    labelByKey.set(`${c.clue_type}:${c.clue_value}`, c.label);
  }
  const rebuild = (k: string): Clue => {
    const [type, value] = k.split(":") as [ClueType, string];
    return { type, value, label: labelByKey.get(k) ?? value };
  };
  const rows = (pick.row_clue_keys as string[]).map(rebuild);
  const cols = (pick.col_clue_keys as string[]).map(rebuild);
  await registerBoardUse(supabase, pick.fingerprint, esport, rows, cols, userId);
  log?.("fallback_success", { fingerprint: pick.fingerprint, reason });
  return json({
    rowClues: rows, colClues: cols, fingerprint: pick.fingerprint,
    quality: pick.quality_score, source: "fallback", fallback_reason: reason,
    requestId: snapshot?.requestId,
  });
}
