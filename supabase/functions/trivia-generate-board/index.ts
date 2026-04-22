// Smart trivia board generation engine.
//
// Pipeline:
//   1. Build the candidate clue pool from approved (active, canonical) clues
//      + auto-derived team/nationality clues from the live esports DB.
//   2. Compute per-clue difficulty (easy/medium/hard) from player coverage.
//   3. Filter overused / recently-used clues (per-user and global).
//   4. Brute-force assemble many candidate boards under diversity caps.
//   5. Validate each candidate cell has >=2 distinct player answers.
//   6. Score boards on solvability, difficulty balance, diversity, freshness
//      and similarity penalty. Pick the best whose board difficulty matches
//      the user's target band (new=easy, returning=medium/hard mix,
//      daily=medium-only).
//   7. Publish boards above QUALITY_THRESHOLD; log rejections; if every
//      candidate fails, fall back to the best previously published board
//      the user hasn't seen lately (matching target difficulty if possible).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClueType = "team" | "nationality" | "tournament" | "role" | "attribute";
type DifficultyBand = "easy" | "medium" | "hard";
type Clue = {
  type: ClueType;
  value: string;
  label: string;
  difficulty?: number;       // 0..1 (0=easiest, 1=hardest)
  difficultyBand?: DifficultyBand;
  playerCount?: number;
};

const NATIONALITY_LABELS: Record<string, string> = {
  US: "USA", RU: "Russia", BR: "Brazil", SE: "Sweden", CN: "China",
  UA: "Ukraine", AU: "Australia", PL: "Poland", DK: "Denmark", FI: "Finland",
  AR: "Argentina", DE: "Germany", FR: "France", GB: "UK", KR: "South Korea",
  CA: "Canada", NO: "Norway", NL: "Netherlands", ES: "Spain", TR: "Turkey",
  CZ: "Czechia", IT: "Italy", BE: "Belgium", PT: "Portugal", JP: "Japan",
};

// ---- Tunables ----------------------------------------------------------------
const TYPE_CAPS: Record<ClueType, number> = {
  team: 2, nationality: 1, role: 1, tournament: 3, attribute: 3,
};
const USER_FRESHNESS_WINDOW = 10;
const GLOBAL_COOLDOWN_MS = 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_MAX = 6;
const MIN_ANSWERS_PER_CELL = 2;
const QUALITY_THRESHOLD = 0.55;
const MAX_CANDIDATES = 24;

// Difficulty thresholds — number of distinct players satisfying a clue.
// Easy = lots of valid answers; Hard = few valid answers.
const DIFF_EASY_MIN_PLAYERS = 25;
const DIFF_HARD_MAX_PLAYERS = 8;

// Beginner status: number of completed sessions before we open up hard boards.
const BEGINNER_SESSION_THRESHOLD = 3;

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

function bandFromPlayerCount(n: number): DifficultyBand {
  if (n >= DIFF_EASY_MIN_PLAYERS) return "easy";
  if (n <= DIFF_HARD_MAX_PLAYERS) return "hard";
  return "medium";
}
function difficultyFromPlayerCount(n: number): number {
  // Map player coverage to a 0..1 hardness score with a soft curve.
  // 50+ players -> ~0 (easiest), 1 player -> ~1 (hardest).
  if (n <= 0) return 1;
  const x = Math.min(1, Math.log(n + 1) / Math.log(60));
  return Math.max(0, Math.min(1, 1 - x));
}
function bandFromScore(score: number): DifficultyBand {
  if (score < 0.34) return "easy";
  if (score > 0.66) return "hard";
  return "medium";
}

// Decide what difficulty band to aim for based on user history & flags.
function targetBand(opts: { sessionCount: number; isDaily: boolean }): {
  preferred: DifficultyBand;
  acceptable: DifficultyBand[];
} {
  if (opts.isDaily) {
    return { preferred: "medium", acceptable: ["medium"] };
  }
  if (opts.sessionCount < BEGINNER_SESSION_THRESHOLD) {
    return { preferred: "easy", acceptable: ["easy", "medium"] };
  }
  // Returning users get the full mix; pick at random with a medium bias.
  const roll = Math.random();
  const preferred: DifficultyBand = roll < 0.45 ? "medium" : roll < 0.8 ? "hard" : "easy";
  return { preferred, acceptable: ["easy", "medium", "hard"] };
}

// ---- handler ----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { esport, templateId, userId, isDaily } = await req.json().catch(() => ({}));
    if (!esport || typeof esport !== "string") {
      return new Response(JSON.stringify({ error: "esport required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // -------- 1) Saved template short-circuit --------
    if (templateId && typeof templateId === "string") {
      const board = await hydrateTemplate(supabase, templateId);
      if (board) {
        const fingerprint = await fingerprintFromClues(board.rows, board.cols);
        await registerBoardUse(supabase, fingerprint, esport, board.rows, board.cols, userId);
        await supabase.rpc("trivia_register_clue_use", {
          _clue_keys: [...board.rows, ...board.cols].map(clueKey),
          _esport: esport,
        });
        return json({ rowClues: board.rows, colClues: board.cols, fingerprint, source: "template" });
      }
    }

    // -------- 2) Build approved + derived clue pools --------
    const [approvedRes, playersRes] = await Promise.all([
      supabase.from("trivia_clues")
        .select("clue_type,clue_value,label,is_active")
        .eq("esport", esport).eq("is_active", true),
      supabase.from("pandascore_players_master")
        .select("id,name,nationality,current_team_id,current_team_name")
        .eq("active", true).eq("videogame_name", esport)
        .not("current_team_id", "is", null).not("nationality", "is", null)
        .limit(5000),
    ]);
    if (playersRes.error) throw playersRes.error;
    const players = playersRes.data ?? [];
    if (players.length < 30) {
      return json({ error: "Not enough players for this esport" }, 400);
    }

    const approvedClues: Clue[] = (approvedRes.data ?? []).map((c: any) => ({
      type: c.clue_type, value: c.clue_value, label: c.label,
    }));

    // derived team/nationality clues from live data (used when approved pool is thin)
    const teamCount = new Map<string, { label: string; count: number }>();
    const nationCount = new Map<string, number>();
    for (const p of players) {
      const tid = String(p.current_team_id);
      const t = teamCount.get(tid);
      if (t) t.count++;
      else teamCount.set(tid, { label: p.current_team_name ?? "Unknown", count: 1 });
      nationCount.set(p.nationality, (nationCount.get(p.nationality) ?? 0) + 1);
    }
    const derivedTeams: Clue[] = [...teamCount.entries()]
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([id, v]) => ({ type: "team", value: id, label: v.label }));
    const derivedNations: Clue[] = [...nationCount.entries()]
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([code]) => ({
        type: "nationality", value: code, label: NATIONALITY_LABELS[code] ?? code,
      }));

    // Merge approved + derived (approved takes precedence on the same key)
    const poolMap = new Map<string, Clue>();
    for (const c of [...derivedTeams, ...derivedNations]) poolMap.set(clueKey(c), c);
    for (const c of approvedClues) poolMap.set(clueKey(c), c);

    // -------- 3) Compute per-clue difficulty (player coverage) --------
    // For team/nationality we can compute directly from `players`.
    // For other types we leave a neutral default (medium).
    const playerHas = players.map((p: any) => ({
      teamId: String(p.current_team_id), nation: p.nationality,
    }));
    const countSatisfying = (c: Clue): number | null => {
      if (c.type === "team") {
        let n = 0; for (const p of playerHas) if (p.teamId === c.value) n++; return n;
      }
      if (c.type === "nationality") {
        let n = 0; for (const p of playerHas) if (p.nation === c.value) n++; return n;
      }
      return null; // unknown coverage for tournament/role/attribute here
    };
    const difficultyRows: any[] = [];
    for (const c of poolMap.values()) {
      const n = countSatisfying(c);
      if (n === null) {
        c.difficulty = 0.5; c.difficultyBand = "medium"; c.playerCount = 0;
        continue;
      }
      c.playerCount = n;
      c.difficulty = difficultyFromPlayerCount(n);
      c.difficultyBand = bandFromPlayerCount(n);
      difficultyRows.push({
        clue_key: clueKey(c),
        esport,
        clue_type: c.type,
        clue_value: c.value,
        player_count: n,
        difficulty_band: c.difficultyBand,
        difficulty_score: Number(c.difficulty.toFixed(4)),
      });
    }
    if (difficultyRows.length > 0) {
      // Best-effort cache; ignore failure.
      await supabase.rpc("trivia_upsert_clue_difficulty", { _rows: difficultyRows })
        .catch(() => {});
    }

    // -------- 4) Apply usage filters --------
    const cluesArr = [...poolMap.values()];
    const keys = cluesArr.map(clueKey);
    const { data: usage } = await supabase
      .from("trivia_clue_usage")
      .select("clue_key,times_used,last_used_at")
      .in("clue_key", keys);
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

    if (filteredClues.length < 6) {
      return await fallbackBoard(supabase, esport, userId, "insufficient_pool_after_filter");
    }

    // -------- 5) Determine target difficulty (user progression) --------
    let sessionCount = 0;
    if (userId) {
      const { data: sc } = await supabase.rpc("trivia_user_session_count", { _user_id: userId });
      sessionCount = typeof sc === "number" ? sc : 0;
    }
    const target = targetBand({ sessionCount, isDaily: !!isDaily });

    // -------- 6) Freshness data --------
    const recentFingerprints = new Set<string>();
    const recentStructures = new Map<string, number>();
    if (userId) {
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
    const { data: hotBoards } = await supabase
      .from("trivia_board_fingerprints")
      .select("fingerprint")
      .eq("esport", esport).gte("last_used_at", cooldownCutoff)
      .limit(500);
    const globallyHot = new Set((hotBoards ?? []).map((b: any) => b.fingerprint));

    // -------- 7) Validity index --------
    const satisfies = (c: Clue, p: { teamId: string; nation: string }) =>
      c.type === "team" ? p.teamId === c.value
        : c.type === "nationality" ? p.nation === c.value
          : false;

    const checkable = filteredClues.filter((c) => c.type === "team" || c.type === "nationality");
    if (checkable.length < 6) {
      return await fallbackBoard(supabase, esport, userId, "checkable_pool_too_small");
    }

    const intersectionAnswers = (a: Clue, b: Clue): number => {
      if (a.type === b.type && a.value === b.value) return 0;
      let n = 0;
      for (const p of playerHas) if (satisfies(a, p) && satisfies(b, p)) n++;
      return n;
    };

    // -------- 8) Brute-force candidate boards --------
    type Candidate = {
      rows: Clue[]; cols: Clue[]; fingerprint: string;
      cellAnswers: number[][]; sig: string;
    };
    const candidates: Candidate[] = [];

    const nationPool = checkable.filter((c) => c.type === "nationality");
    const teamPool   = checkable.filter((c) => c.type === "team");
    const layouts: Array<[Clue[], Clue[]]> = [
      [shuffle(nationPool), shuffle(teamPool)],
      [shuffle(teamPool), shuffle(nationPool)],
      [shuffle(checkable), shuffle(checkable)],
    ];

    outer: for (const [rowSrc, colSrc] of layouts) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const rs = shuffle(rowSrc).slice(0, 12);
        const cs = shuffle(colSrc).slice(0, 12);
        for (let r1 = 0; r1 < rs.length; r1++) {
          for (let r2 = r1 + 1; r2 < rs.length; r2++) {
            if (clueKey(rs[r1]) === clueKey(rs[r2])) continue;
            for (let r3 = r2 + 1; r3 < rs.length; r3++) {
              if (clueKey(rs[r3]) === clueKey(rs[r1])) continue;
              if (clueKey(rs[r3]) === clueKey(rs[r2])) continue;
              const rows = [rs[r1], rs[r2], rs[r3]];
              const used = new Set(rows.map(clueKey));
              const colCand = cs.filter((c) => !used.has(clueKey(c)));
              for (let c1 = 0; c1 < colCand.length; c1++) {
                for (let c2 = c1 + 1; c2 < colCand.length; c2++) {
                  if (clueKey(colCand[c2]) === clueKey(colCand[c1])) continue;
                  for (let c3 = c2 + 1; c3 < colCand.length; c3++) {
                    if (clueKey(colCand[c3]) === clueKey(colCand[c1])) continue;
                    if (clueKey(colCand[c3]) === clueKey(colCand[c2])) continue;
                    const cols = [colCand[c1], colCand[c2], colCand[c3]];
                    if (!passesDiversity(rows, cols)) continue;

                    const cellAnswers: number[][] = [[], [], []].map(() => []);
                    let ok = true;
                    for (let i = 0; i < 3 && ok; i++) {
                      for (let j = 0; j < 3 && ok; j++) {
                        const n = intersectionAnswers(rows[i], cols[j]);
                        if (n < MIN_ANSWERS_PER_CELL) ok = false;
                        cellAnswers[i][j] = n;
                      }
                    }
                    if (!ok) continue;

                    const fp = await fingerprintFromClues(rows, cols);
                    if (recentFingerprints.has(fp)) continue;

                    candidates.push({
                      rows, cols, fingerprint: fp, cellAnswers,
                      sig: structureSignature([...rows, ...cols]),
                    });
                    if (candidates.length >= MAX_CANDIDATES) break outer;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (candidates.length === 0) {
      return await fallbackBoard(supabase, esport, userId, "no_valid_candidates", target);
    }

    // -------- 9) Score & pick --------
    const scored = candidates.map((c) => {
      const all = [...c.rows, ...c.cols];
      const flat = c.cellAnswers.flat();
      const avgAns = flat.reduce((a, b) => a + b, 0) / 9;
      const solvability = Math.min(1, avgAns / 6);

      const max = Math.max(...flat), min = Math.min(...flat);
      const spread = max === 0 ? 0 : (max - min) / max;
      const difficulty = 1 - Math.min(1, spread); // tighter = better

      const distinctTypes = new Set(all.map((x) => x.type)).size;
      const diversity = Math.min(1, distinctTypes / 4);

      const seenStructure = recentStructures.get(c.sig) ?? 0;
      const fresh = Math.max(0, 1 - seenStructure * 0.25 - (globallyHot.has(c.fingerprint) ? 0.3 : 0));
      const similarityPenalty = Math.min(0.4, seenStructure * 0.15);

      const quality =
        solvability * 0.30 +
        difficulty  * 0.20 +
        diversity   * 0.25 +
        fresh       * 0.25 -
        similarityPenalty;

      // Board difficulty: average clue difficulty, biased by how few answers each cell has.
      const avgClueDifficulty = all.reduce((s, x) => s + (x.difficulty ?? 0.5), 0) / all.length;
      // Cell-answer hardness: fewer answers per cell → harder. Cap at 12 answers = saturated.
      const cellHardness = 1 - Math.min(1, avgAns / 12);
      const boardDifficultyScore = Math.max(0, Math.min(1,
        avgClueDifficulty * 0.65 + cellHardness * 0.35,
      ));
      const boardBand = bandFromScore(boardDifficultyScore);

      return {
        ...c,
        avgAns,
        scores: { solvability, difficulty, diversity, fresh, quality },
        boardDifficultyScore,
        boardBand,
      };
    });

    // Pick: prefer the user's target band; if none match, fall back to acceptable bands; else best overall.
    const matchPreferred = scored
      .filter((s) => s.boardBand === target.preferred)
      .sort((a, b) => b.scores.quality - a.scores.quality);
    const matchAcceptable = scored
      .filter((s) => target.acceptable.includes(s.boardBand))
      .sort((a, b) => b.scores.quality - a.scores.quality);
    const sortedAll = [...scored].sort((a, b) => b.scores.quality - a.scores.quality);
    const best = matchPreferred[0] ?? matchAcceptable[0] ?? sortedAll[0];

    // -------- 10) Publish or reject --------
    if (best.scores.quality < QUALITY_THRESHOLD) {
      await supabase.rpc("trivia_log_board_rejection", {
        _esport: esport,
        _fingerprint: best.fingerprint,
        _reason: "below_quality_threshold",
        _quality: best.scores.quality,
        _details: { ...best.scores, boardBand: best.boardBand, boardDifficultyScore: best.boardDifficultyScore },
      });
      return await fallbackBoard(supabase, esport, userId, "quality_threshold", target);
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
    await supabase.rpc("trivia_finalize_board_difficulty", {
      _fingerprint: best.fingerprint,
      _board_difficulty: best.boardBand,
      _board_difficulty_score: Number(best.boardDifficultyScore.toFixed(4)),
      _avg_cell_answers: Number(best.avgAns.toFixed(2)),
    }).catch(() => {});
    await supabase.rpc("trivia_register_clue_use", {
      _clue_keys: [...best.rows, ...best.cols].map(clueKey),
      _esport: esport,
    });

    return json({
      rowClues: best.rows,
      colClues: best.cols,
      fingerprint: best.fingerprint,
      quality: best.scores.quality,
      difficulty: best.boardBand,
      difficultyScore: best.boardDifficultyScore,
      targetDifficulty: target.preferred,
      source: "generated",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
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

/**
 * Fallback: pick the highest-quality previously published board the user
 * has not seen recently. Prefer boards matching the requested difficulty band.
 */
async function fallbackBoard(
  supabase: any,
  esport: string,
  userId: string | undefined,
  reason: string,
  target?: { preferred: DifficultyBand; acceptable: DifficultyBand[] },
) {
  const { data: top } = await supabase.rpc("trivia_top_boards", {
    _esport: esport, _limit: 25,
  });
  if (!top || top.length === 0) {
    return json({ error: `Could not generate a board (${reason}) and no fallback exists` }, 500);
  }
  let recentSet = new Set<string>();
  if (userId) {
    const { data: recent } = await supabase.rpc("trivia_recent_user_fingerprints", {
      _user_id: userId, _esport: esport, _limit: USER_FRESHNESS_WINDOW,
    });
    recentSet = new Set((recent ?? []).map((r: any) => r.fingerprint));
  }
  const ranked = top as any[];
  const fresh = ranked.filter((b) => !recentSet.has(b.fingerprint));
  const pool = fresh.length > 0 ? fresh : ranked;

  const matchPreferred = target
    ? pool.find((b) => b.board_difficulty === target.preferred)
    : null;
  const matchAcceptable = target
    ? pool.find((b) => target.acceptable.includes(b.board_difficulty))
    : null;
  const pick = matchPreferred ?? matchAcceptable ?? pool[0];

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
  return json({
    rowClues: rows,
    colClues: cols,
    fingerprint: pick.fingerprint,
    quality: pick.quality_score,
    difficulty: pick.board_difficulty ?? "medium",
    source: "fallback",
    fallback_reason: reason,
  });
}
