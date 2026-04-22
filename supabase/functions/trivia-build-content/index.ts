// Generates production-ready trivia clues + grid templates for one esport.
// Uses ONLY Tier S/A data via the trivia_player_clue_index table.
//
// POST body: { esport: string, maxBoards?: number, dryRun?: boolean }
// Requires admin (checked via has_role).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClueType =
  | "team"
  | "league"
  | "tournament"
  | "year"
  | "teammate"
  | "faced";

interface ClueCandidate {
  clue_type: ClueType;
  clue_value: string;
  label: string;
  count: number;
  difficulty_band: "easy" | "medium" | "hard";
}

interface StoredClue extends ClueCandidate {
  id: string;
}

const MIN_ANSWERS = 4;
const MAX_ANSWERS = 30;
const MIN_CELL_ANSWERS = 2;
const CLUE_KEY_SEPARATOR = "\u001f";

function bandFor(count: number): "easy" | "medium" | "hard" | null {
  if (count >= 15 && count <= MAX_ANSWERS) return "easy";
  if (count >= 8 && count < 15) return "medium";
  if (count >= MIN_ANSWERS && count < 8) return "hard";
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function clueKey(type: ClueType, value: string): string {
  return `${type}${CLUE_KEY_SEPARATOR}${value}`;
}

function parseClueKey(key: string): { type: ClueType; value: string } {
  const idx = key.indexOf(CLUE_KEY_SEPARATOR);
  return {
    type: key.slice(0, idx) as ClueType,
    value: key.slice(idx + CLUE_KEY_SEPARATOR.length),
  };
}

async function fetchAllRows<T>(
  loader: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loader(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check — must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const esport: string = body.esport;
    const maxBoards: number = Math.min(Math.max(Number(body.maxBoards ?? 20), 1), 30);
    const dryRun: boolean = !!body.dryRun;
    if (!esport) {
      return new Response(JSON.stringify({ error: "esport is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // ---- 0. Read from the precomputed Tier S/A player history cache ----
    const historyRows = await fetchAllRows<{
      player_id: string;
      team_id: string | null;
      opponent_team_id: string | null;
      serie_id: string | null;
      league_name: string | null;
      year: number | null;
      teammate_ids: string[] | null;
    }>(async (from, to) =>
      await sb
        .from("trivia_player_history_cache")
        .select("player_id, team_id, opponent_team_id, serie_id, league_name, year, teammate_ids")
        .eq("esport", esport)
        .range(from, to),
    );

    const activePlayers = await fetchAllRows<{ id: number; name: string }>(async (from, to) =>
      await sb
        .from("pandascore_players_master")
        .select("id, name")
        .eq("videogame_name", esport)
        .eq("active", true)
        .range(from, to),
    );

    const activePlayerIds = new Set(activePlayers.map((row) => String(row.id)));
    const activePlayerName = new Map(activePlayers.map((row) => [String(row.id), row.name]));

    const setFor = new Map<string, Set<number>>();
    const addRelation = (type: ClueType, value: string | number | null | undefined, playerId: string) => {
      if (value === null || value === undefined) return;
      if (!activePlayerIds.has(playerId)) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      const key = clueKey(type, normalized);
      let set = setFor.get(key);
      if (!set) {
        set = new Set<number>();
        setFor.set(key, set);
      }
      set.add(Number(playerId));
    };

    for (const row of historyRows) {
      const playerId = String(row.player_id);
      if (!activePlayerIds.has(playerId)) continue;
      addRelation("team", row.team_id, playerId);
      addRelation("faced", row.opponent_team_id, playerId);
      addRelation("tournament", row.serie_id, playerId);
      addRelation("league", row.league_name, playerId);
      addRelation("year", row.year, playerId);
      for (const teammateId of row.teammate_ids ?? []) {
        if (teammateId !== playerId && activePlayerIds.has(String(teammateId))) {
          addRelation("teammate", teammateId, playerId);
        }
      }
    }

    const indexRows = Array.from(setFor.values()).reduce((sum, set) => sum + set.size, 0);

    // ---- 1. Build candidate pools per clue type ----
    const agg = new Map<string, { type: ClueType; value: string; count: number }>();
    for (const [key, players] of setFor.entries()) {
      const { type, value } = parseClueKey(key);
      agg.set(key, { type, value, count: players.size });
    }

    // ---- 2. Resolve human labels ----
    // Teams & opponents
    const teamIds = new Set<string>();
    for (const v of agg.values()) {
      if (v.type === "team" || v.type === "faced") teamIds.add(v.value);
    }
    const teamIdList = Array.from(teamIds);
    const teamRows = teamIdList.length === 0
      ? []
      : (await Promise.all(
          chunk(teamIdList, 100).map(async (ids) => {
            const { data, error } = await sb
              .from("trivia_top_tier_teams")
              .select("team_id, team_name, esport")
              .eq("esport", esport)
              .in("team_id", ids);
            if (error) throw error;
            return data ?? [];
          }),
        )).flat();
    const teamName = new Map<string, string>(
      teamRows.map((r: any) => [r.team_id, r.team_name]),
    );

    // Series (tournaments) — value is serie_id
    const serieIds = new Set<string>();
    for (const v of agg.values()) if (v.type === "tournament") serieIds.add(v.value);
    const serieIdList = Array.from(serieIds);
    const serieRows = serieIdList.length === 0
      ? []
      : (await Promise.all(
          chunk(serieIdList, 100).map(async (ids) => {
            const { data, error } = await sb
              .from("trivia_top_tier_series")
              .select("serie_id, serie_name, esport")
              .eq("esport", esport)
              .in("serie_id", ids);
            if (error) throw error;
            return data ?? [];
          }),
        )).flat();
    const serieName = new Map<string, string>();
    for (const r of serieRows) {
      if (!serieName.has((r as any).serie_id)) {
        serieName.set((r as any).serie_id, (r as any).serie_name);
      }
    }

    // Teammates — value is player_id (text)
    const playerIds = new Set<string>();
    for (const v of agg.values()) if (v.type === "teammate") playerIds.add(v.value);
    const playerName = new Map<string, string>();
    for (const playerId of playerIds) {
      const name = activePlayerName.get(playerId);
      if (name) playerName.set(playerId, name);
    }

    // ---- 3. Build clue candidates that pass [4, 30] ----
    const candidates: ClueCandidate[] = [];
    const seenLabels = new Set<string>();
    for (const v of agg.values()) {
      const band = bandFor(v.count);
      if (!band) continue;

      let label = "";
      if (v.type === "team") {
        const n = teamName.get(v.value);
        if (!n) continue;
        label = `Played for ${n}`;
      } else if (v.type === "faced") {
        const n = teamName.get(v.value);
        if (!n) continue;
        label = `Faced ${n}`;
      } else if (v.type === "league") {
        if (!v.value || v.value.length < 2) continue;
        label = `Played in ${v.value}`;
      } else if (v.type === "tournament") {
        const n = serieName.get(v.value);
        if (!n) continue;
        label = `Played in ${n}`;
      } else if (v.type === "year") {
        const y = Number(v.value);
        if (!Number.isFinite(y) || y < 2010 || y > 2030) continue;
        label = `Played in ${y}`;
      } else if (v.type === "teammate") {
        const n = playerName.get(v.value);
        if (!n) continue;
        label = `Was teammate of ${n}`;
      }

      const dup = label.toLowerCase().trim();
      if (seenLabels.has(dup)) continue;
      seenLabels.add(dup);

      candidates.push({
        clue_type: v.type,
        clue_value: v.value,
        label,
        count: v.count,
        difficulty_band: band,
      });
    }

    // ---- 4. Persist clues (upsert by (esport, clue_type, clue_value)) ----
    let storedClues: StoredClue[] = [];
    if (!dryRun && candidates.length > 0) {
      // Delete previously generated clues for this esport so we start fresh
      await sb
        .from("trivia_clues")
        .delete()
        .eq("esport", esport)
        .eq("is_generated", true);

      const insertPayload = candidates.map((c) => ({
        label: c.label,
        clue_type: c.clue_type,
        clue_value: c.clue_value,
        esport,
        is_active: true,
        is_generated: true,
        valid_answer_count: c.count,
        difficulty_band: c.difficulty_band,
        tier: "sa",
        source_videogame: esport,
      }));

      // chunk insert
      const chunkSize = 500;
      const inserted: any[] = [];
      for (let i = 0; i < insertPayload.length; i += chunkSize) {
        const chunk = insertPayload.slice(i, i + chunkSize);
        const { data, error } = await sb
          .from("trivia_clues")
          .insert(chunk)
          .select("id, clue_type, clue_value, label, valid_answer_count, difficulty_band");
        if (error) throw error;
        inserted.push(...(data ?? []));
      }
      storedClues = inserted.map((r) => ({
        id: r.id,
        clue_type: r.clue_type,
        clue_value: r.clue_value,
        label: r.label,
        count: r.valid_answer_count,
        difficulty_band: r.difficulty_band,
      }));
    } else {
      storedClues = candidates.map((c) => ({ ...c, id: `${c.clue_type}|${c.clue_value}` }));
    }

    function intersectionSize(a: StoredClue, b: StoredClue): number {
      const sa = setFor.get(clueKey(a.clue_type, a.clue_value)) ?? new Set<number>();
      const sb_ = setFor.get(clueKey(b.clue_type, b.clue_value)) ?? new Set<number>();
      const [small, big] = sa.size <= sb_.size ? [sa, sb_] : [sb_, sa];
      let n = 0;
      for (const x of small) if (big.has(x)) n++;
      return n;
    }

    // ---- 6. Bucket clues by type for diversity-aware selection ----
    const byType = new Map<ClueType, StoredClue[]>();
    for (const c of storedClues) {
      const arr = byType.get(c.clue_type) ?? [];
      arr.push(c);
      byType.set(c.clue_type, arr);
    }
    for (const [t, arr] of byType) byType.set(t, shuffle(arr));

    // ---- 7. Build boards ----
    interface Board {
      rowIds: string[];
      colIds: string[];
      rowClues: StoredClue[];
      colClues: StoredClue[];
      avgCellAnswers: number;
      minCellAnswers: number;
      quality: number;
      difficulty: "easy" | "medium" | "hard";
      typeMix: Record<string, number>;
    }

    const boards: Board[] = [];
    const usedFingerprints = new Set<string>();

    function fingerprint(rows: StoredClue[], cols: StoredClue[]): string {
      const keys = [...rows, ...cols]
        .map((c) => `${c.clue_type}:${c.clue_value}`)
        .sort();
      return keys.join("|");
    }

    function violatesDiversity(picks: StoredClue[]): boolean {
      const counts: Record<string, number> = {};
      for (const c of picks) counts[c.clue_type] = (counts[c.clue_type] ?? 0) + 1;
      // Hard caps per board (3 row + 3 col = 6 clues total)
      if ((counts.team ?? 0) > 3) return true;
      if ((counts.year ?? 0) > 1) return true;
      if ((counts.faced ?? 0) > 2) return true;
      if ((counts.teammate ?? 0) > 2) return true;
      if ((counts.league ?? 0) > 2) return true;
      // Need at least 3 distinct clue types
      const distinct = Object.values(counts).filter((n) => n > 0).length;
      if (distinct < 3) return true;
      return false;
    }

    // Pick a diverse set of 6 clues
    function tryBuildBoard(): Board | null {
      const types: ClueType[] = ["team", "league", "tournament", "year", "teammate", "faced"];
      const pool: StoredClue[] = [];
      // Bias: prefer team + tournament + league as backbone
      const backbone: ClueType[] = ["team", "tournament", "league"];
      for (const t of backbone) {
        const arr = byType.get(t);
        if (arr && arr.length > 0) pool.push(arr[Math.floor(Math.random() * arr.length)]);
      }
      // Fill the rest from any allowed types
      while (pool.length < 6) {
        const t = types[Math.floor(Math.random() * types.length)];
        const arr = byType.get(t);
        if (!arr || arr.length === 0) {
          // remove that type from rotation by skipping
          continue;
        }
        const candidate = arr[Math.floor(Math.random() * arr.length)];
        if (pool.some((p) => p.id === candidate.id)) continue;
        pool.push(candidate);
        if (pool.length >= 6 && violatesDiversity(pool)) {
          // try replacing the last one a few times
          let attempts = 0;
          while (violatesDiversity(pool) && attempts < 20) {
            pool.pop();
            const t2 = types[Math.floor(Math.random() * types.length)];
            const arr2 = byType.get(t2);
            if (!arr2 || arr2.length === 0) {
              attempts++;
              continue;
            }
            const cand2 = arr2[Math.floor(Math.random() * arr2.length)];
            if (!pool.some((p) => p.id === cand2.id)) pool.push(cand2);
            attempts++;
          }
          if (violatesDiversity(pool)) return null;
        }
      }

      // Try every (3 rows, 3 cols) split out of the 6 picks (C(6,3)=20)
      const indices = [0, 1, 2, 3, 4, 5];
      function* combos3(): Generator<number[]> {
        for (let a = 0; a < 6; a++)
          for (let b = a + 1; b < 6; b++)
            for (let c = b + 1; c < 6; c++) yield [a, b, c];
      }

      let best: Board | null = null;
      for (const rowIdx of combos3()) {
        const colIdx = indices.filter((i) => !rowIdx.includes(i));
        const rows = rowIdx.map((i) => pool[i]);
        const cols = colIdx.map((i) => pool[i]);

        // Validate every cell has >= MIN_CELL_ANSWERS
        let ok = true;
        let total = 0;
        let minCell = Infinity;
        for (const r of rows) {
          for (const c of cols) {
            // skip same-clue intersections (shouldn't happen with our split)
            if (r.id === c.id) {
              ok = false;
              break;
            }
            const n = intersectionSize(r, c);
            if (n < MIN_CELL_ANSWERS) {
              ok = false;
              break;
            }
            total += n;
            if (n < minCell) minCell = n;
          }
          if (!ok) break;
        }
        if (!ok) continue;

        const avg = total / 9;
        // Quality: solvability + diversity + difficulty balance
        const solvability = Math.min(1, avg / 8); // saturates at avg 8 answers/cell
        const typeMix: Record<string, number> = {};
        for (const x of [...rows, ...cols]) typeMix[x.clue_type] = (typeMix[x.clue_type] ?? 0) + 1;
        const distinctTypes = Object.keys(typeMix).length;
        const diversity = Math.min(1, distinctTypes / 4);
        // Difficulty band of board based on avg cell answers
        const boardDiff: "easy" | "medium" | "hard" =
          avg >= 8 ? "easy" : avg >= 4 ? "medium" : "hard";
        // Reward boards whose clue difficulty bands are mixed
        const bands = new Set([...rows, ...cols].map((c) => c.difficulty_band));
        const balance = bands.size === 1 ? 0.5 : bands.size === 2 ? 0.85 : 1.0;
        const quality = solvability * 0.5 + diversity * 0.25 + balance * 0.25;

        const board: Board = {
          rowIds: rows.map((r) => r.id),
          colIds: cols.map((c) => c.id),
          rowClues: rows,
          colClues: cols,
          avgCellAnswers: Number(avg.toFixed(2)),
          minCellAnswers: minCell,
          quality: Number(quality.toFixed(3)),
          difficulty: boardDiff,
          typeMix,
        };
        if (!best || board.quality > best.quality) best = board;
      }
      return best;
    }

    const TARGET = maxBoards;
    const MAX_ATTEMPTS = TARGET * 25;
    let attempts = 0;
    while (boards.length < TARGET && attempts < MAX_ATTEMPTS) {
      attempts++;
      const b = tryBuildBoard();
      if (!b) continue;
      const fp = fingerprint(b.rowClues, b.colClues);
      if (usedFingerprints.has(fp)) continue;
      // Reject low-quality boards
      if (b.quality < 0.55) continue;
      usedFingerprints.add(fp);
      boards.push(b);
    }

    // ---- 8. Persist boards ----
    if (!dryRun && boards.length > 0) {
      await sb
        .from("trivia_grid_templates")
        .delete()
        .eq("esport", esport)
        .eq("is_generated", true);

      const payload = boards.map((b, i) => ({
        name: `${esport} Auto #${i + 1} (${b.difficulty})`,
        esport,
        is_active: true,
        is_generated: true,
        row_clue_ids: b.rowIds,
        col_clue_ids: b.colIds,
        quality_score: b.quality,
        board_difficulty: b.difficulty,
        cell_min_answers: b.minCellAnswers,
        avg_cell_answers: b.avgCellAnswers,
      }));
      const chunk = 200;
      for (let i = 0; i < payload.length; i += chunk) {
        const { error } = await sb
          .from("trivia_grid_templates")
          .insert(payload.slice(i, i + chunk));
        if (error) throw error;
      }
    }

    return new Response(
      JSON.stringify({
        esport,
        indexRows,
        candidateClues: candidates.length,
        cluesByType: Object.fromEntries(
          Array.from(byType.entries()).map(([t, arr]) => [t, arr.length]),
        ),
        boardsBuilt: boards.length,
        boardsSample: boards.slice(0, 3).map((b) => ({
          difficulty: b.difficulty,
          quality: b.quality,
          avgCellAnswers: b.avgCellAnswers,
          minCellAnswers: b.minCellAnswers,
          rows: b.rowClues.map((c) => c.label),
          cols: b.colClues.map((c) => c.label),
        })),
        dryRun,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("trivia-build-content error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
