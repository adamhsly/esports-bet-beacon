// Smart trivia board generation engine.
//
// Pipeline:
//   1. Build the candidate clue pool from approved (active, canonical) clues
//      + auto-derived team/nationality clues from the live esports DB.
//   2. Filter overused / recently-used clues (per-user and global).
//   3. Brute-force assemble many candidate boards under diversity caps.
//   4. Validate each candidate cell has >=2 distinct player answers.
//   5. Score boards on solvability, difficulty balance, diversity, freshness
//      and similarity penalty. Best score wins.
//   6. Publish boards above QUALITY_THRESHOLD; log rejections; if every
//      candidate fails, fall back to the best previously published board
//      the user hasn't seen lately.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClueType = "team" | "nationality" | "tournament" | "role" | "attribute";
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
  team: 2, nationality: 1, role: 1, tournament: 3, attribute: 3,
};
const USER_FRESHNESS_WINDOW = 10;
const GLOBAL_COOLDOWN_MS = 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLUE_OVERUSE_RECENT_MAX = 6;     // skip clue if used more than this in last 24h
const MIN_ANSWERS_PER_CELL = 2;
const QUALITY_THRESHOLD = 0.55;        // 0..1; below = reject
const MAX_CANDIDATES = 24;

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

  try {
    const { esport, templateId, userId } = await req.json().catch(() => ({}));
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

    // -------- 3) Apply usage filters --------
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
      // hard skip if hammered in the last 24h
      if (u.last >= cutoff && u.times >= CLUE_OVERUSE_RECENT_MAX) return false;
      return true;
    });

    if (filteredClues.length < 6) {
      // Not enough clues after filtering — fall back without the overuse filter
      return await fallbackBoard(supabase, esport, userId, "insufficient_pool_after_filter");
    }

    // -------- 4) Freshness data --------
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

    // -------- 5) Validity index --------
    const playerHas = players.map((p: any) => ({
      teamId: String(p.current_team_id), nation: p.nationality,
    }));
    const satisfies = (c: Clue, p: { teamId: string; nation: string }) =>
      c.type === "team" ? p.teamId === c.value
        : c.type === "nationality" ? p.nation === c.value
          : false; // tournament/role/attribute can't be checked from this slim view; skip in candidate pool below

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

    // -------- 6) Brute-force candidate boards --------
    type Candidate = { rows: Clue[]; cols: Clue[]; fingerprint: string;
      cellAnswers: number[][]; sig: string };
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
      return await fallbackBoard(supabase, esport, userId, "no_valid_candidates");
    }

    // -------- 7) Score & pick --------
    const scored = candidates.map((c) => {
      const all = [...c.rows, ...c.cols];
      // solvability — average answer count per cell, normalized to a 0..1 range
      const flat = c.cellAnswers.flat();
      const avgAns = flat.reduce((a, b) => a + b, 0) / 9;
      const solvability = Math.min(1, avgAns / 6); // 6+ avg answers = saturated

      // difficulty balance — penalize boards where any cell is much easier/harder
      const max = Math.max(...flat), min = Math.min(...flat);
      const spread = max === 0 ? 0 : (max - min) / max;
      const difficulty = 1 - Math.min(1, spread); // tighter = better

      // diversity — number of distinct types / 5 possible (team, nat, tour, role, attr)
      const distinctTypes = new Set(all.map((x) => x.type)).size;
      const diversity = Math.min(1, distinctTypes / 4);

      // freshness — penalize structure repeats and global hotness
      const seenStructure = recentStructures.get(c.sig) ?? 0;
      const fresh = Math.max(0, 1 - seenStructure * 0.25 - (globallyHot.has(c.fingerprint) ? 0.3 : 0));

      // similarity penalty — proxy: shared clue keys with most-recent fingerprint set
      // (recentFingerprints is a Set of hashes; we don't have their keys here, so
      // structure overlap is the strongest signal we have)
      const similarityPenalty = Math.min(0.4, seenStructure * 0.15);

      const quality =
        solvability * 0.30 +
        difficulty  * 0.20 +
        diversity   * 0.25 +
        fresh       * 0.25 -
        similarityPenalty;

      return { ...c, scores: { solvability, difficulty, diversity, fresh, quality } };
    }).sort((a, b) => b.scores.quality - a.scores.quality);

    const best = scored[0];

    // -------- 8) Publish or reject --------
    if (best.scores.quality < QUALITY_THRESHOLD) {
      await supabase.rpc("trivia_log_board_rejection", {
        _esport: esport,
        _fingerprint: best.fingerprint,
        _reason: "below_quality_threshold",
        _quality: best.scores.quality,
        _details: best.scores,
      });
      return await fallbackBoard(supabase, esport, userId, "quality_threshold");
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
    await supabase.rpc("trivia_register_clue_use", {
      _clue_keys: [...best.rows, ...best.cols].map(clueKey),
      _esport: esport,
    });

    return json({
      rowClues: best.rows,
      colClues: best.cols,
      fingerprint: best.fingerprint,
      quality: best.scores.quality,
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
 * has not seen recently. If even that fails, return an error.
 */
async function fallbackBoard(
  supabase: any, esport: string, userId: string | undefined, reason: string,
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
  const pick = (top as any[]).find((b) => !recentSet.has(b.fingerprint)) ?? top[0];

  // Hydrate keys back into Clue objects (we stored "type:value" + had labels)
  // We need labels — try the trivia_clues library first, else fall back to value
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
    rowClues: rows, colClues: cols, fingerprint: pick.fingerprint,
    quality: pick.quality_score, source: "fallback", fallback_reason: reason,
  });
}
