// Generates a 3x3 trivia board for a given esport.
// Picks 3 row clues + 3 column clues such that every (row,col) intersection
// has at least 1 active player satisfying both, while enforcing diversity
// caps and avoiding boards the user has recently seen.

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

// Diversity caps applied across the WHOLE board (rows + cols, 6 clues total)
const TYPE_CAPS: Record<ClueType, number> = {
  team: 2,
  nationality: 1,
  role: 1,
  tournament: 3,   // tournaments are plentiful and varied
  attribute: 3,
};

// Recent boards (per user) we will refuse to repeat
const USER_FRESHNESS_WINDOW = 10;
// Global cooldown — boards used in the last hour get penalized
const GLOBAL_COOLDOWN_MS = 60 * 60 * 1000;

// ---------- helpers ----------
const clueKey = (c: Clue) => `${c.type}:${c.value}`;

function structureSignature(clues: Clue[]): string {
  const counts: Record<string, number> = {};
  for (const c of clues) counts[c.type] = (counts[c.type] ?? 0) + 1;
  return Object.keys(counts).sort().map((k) => `${k}:${counts[k]}`).join(",");
}

function clueTypeCounts(clues: Clue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of clues) counts[c.type] = (counts[c.type] ?? 0) + 1;
  return counts;
}

async function fingerprintFromClues(rows: Clue[], cols: Clue[]): Promise<string> {
  const rowKeys = rows.map(clueKey).sort();
  const colKeys = cols.map(clueKey).sort();
  // Order-insensitive across rows vs cols since transpose feels identical
  const sides = [rowKeys.join("|"), colKeys.join("|")].sort().join("||");
  const buf = new TextEncoder().encode(sides);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function passesDiversity(rows: Clue[], cols: Clue[]): boolean {
  const all = [...rows, ...cols];
  const counts = clueTypeCounts(all);
  for (const [type, cap] of Object.entries(TYPE_CAPS)) {
    if ((counts[type] ?? 0) > cap) return false;
  }
  // Require at least 2 distinct clue types across the board
  return Object.keys(counts).length >= 2;
}

const shuffle = <T,>(arr: T[]) =>
  arr.map((v) => [Math.random(), v] as const)
     .sort((a, b) => a[0] - b[0])
     .map(([, v]) => v);

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { esport, templateId, userId } = await req.json().catch(() => ({}));
    if (!esport || typeof esport !== "string") {
      return new Response(JSON.stringify({ error: "esport required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // -------- 1) Hydrate from saved template if requested --------
    if (templateId && typeof templateId === "string") {
      const { data: tpl } = await supabase
        .from("trivia_grid_templates")
        .select("row_clue_ids,col_clue_ids,is_active")
        .eq("id", templateId)
        .maybeSingle();
      if (tpl && tpl.is_active) {
        const ids = [...tpl.row_clue_ids, ...tpl.col_clue_ids];
        const { data: clues } = await supabase
          .from("trivia_clues")
          .select("id,label,clue_type,clue_value")
          .in("id", ids);
        const byId = new Map((clues ?? []).map((c: any) => [c.id, c]));
        const toClue = (id: string): Clue | null => {
          const c: any = byId.get(id);
          return c ? { type: c.clue_type, value: c.clue_value, label: c.label } : null;
        };
        const rowClues = tpl.row_clue_ids.map(toClue).filter(Boolean) as Clue[];
        const colClues = tpl.col_clue_ids.map(toClue).filter(Boolean) as Clue[];
        if (rowClues.length === 3 && colClues.length === 3) {
          const fingerprint = await fingerprintFromClues(rowClues, colClues);
          await registerBoard(supabase, fingerprint, esport, rowClues, colClues, userId);
          return new Response(
            JSON.stringify({ rowClues, colClues, fingerprint, source: "template" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // -------- 2) Build candidate pools from active players --------
    const { data: players, error } = await supabase
      .from("pandascore_players_master")
      .select("id,name,nationality,current_team_id,current_team_name")
      .eq("active", true)
      .eq("videogame_name", esport)
      .not("current_team_id", "is", null)
      .not("nationality", "is", null)
      .limit(5000);

    if (error) throw error;
    if (!players || players.length < 30) {
      return new Response(
        JSON.stringify({ error: "Not enough players for this esport" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const teamCount = new Map<string, { label: string; count: number }>();
    const nationCount = new Map<string, number>();
    for (const p of players) {
      const tid = String(p.current_team_id);
      const t = teamCount.get(tid);
      if (t) t.count++;
      else teamCount.set(tid, { label: p.current_team_name ?? "Unknown", count: 1 });
      nationCount.set(p.nationality, (nationCount.get(p.nationality) ?? 0) + 1);
    }

    const teamPool: Clue[] = [...teamCount.entries()]
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([id, v]) => ({ type: "team", value: id, label: v.label }));

    const nationPool: Clue[] = [...nationCount.entries()]
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([code, _c]) => ({
        type: "nationality",
        value: code,
        label: NATIONALITY_LABELS[code] ?? code,
      }));

    // -------- 3) Freshness data --------
    const recentFingerprints = new Set<string>();
    const recentStructures = new Map<string, number>(); // structure -> count in user's recent
    if (userId) {
      const { data: recent } = await supabase.rpc("trivia_recent_user_fingerprints", {
        _user_id: userId,
        _esport: esport,
        _limit: USER_FRESHNESS_WINDOW,
      });
      for (const r of (recent ?? []) as any[]) {
        recentFingerprints.add(r.fingerprint);
        if (r.structure_signature) {
          recentStructures.set(
            r.structure_signature,
            (recentStructures.get(r.structure_signature) ?? 0) + 1,
          );
        }
      }
    }

    const cooldownCutoff = new Date(Date.now() - GLOBAL_COOLDOWN_MS).toISOString();
    const { data: hotBoards } = await supabase
      .from("trivia_board_fingerprints")
      .select("fingerprint")
      .eq("esport", esport)
      .gte("last_used_at", cooldownCutoff)
      .limit(500);
    const globallyHot = new Set((hotBoards ?? []).map((b: any) => b.fingerprint));

    // -------- 4) Validity helpers --------
    const playerHas = players.map((p) => ({
      teamId: String(p.current_team_id),
      nation: p.nationality,
    }));
    const satisfies = (clue: Clue, p: { teamId: string; nation: string }) =>
      clue.type === "team" ? p.teamId === clue.value : p.nation === clue.value;
    const intersectionHas = (a: Clue, b: Clue): boolean => {
      if (a.type === b.type && a.value === b.value) return false;
      for (const p of playerHas) if (satisfies(a, p) && satisfies(b, p)) return true;
      return false;
    };

    // -------- 5) Assemble a board with diversity + freshness --------
    type Board = { rows: Clue[]; cols: Clue[]; fingerprint: string; score: number };
    const candidates: Board[] = [];

    const layouts: Array<[Clue[], Clue[]]> = [
      [shuffle(nationPool), shuffle(teamPool)],
      [shuffle(teamPool), shuffle(nationPool)],
      [shuffle([...nationPool, ...teamPool]), shuffle([...nationPool, ...teamPool])],
    ];

    outer: for (const [rowSrc, colSrc] of layouts) {
      for (let attempt = 0; attempt < 80; attempt++) {
        const rs = shuffle(rowSrc).slice(0, 12);
        const cs = shuffle(colSrc).slice(0, 12);
        for (let r1 = 0; r1 < rs.length; r1++) {
          for (let r2 = r1 + 1; r2 < rs.length; r2++) {
            if (rs[r1].type === rs[r2].type && rs[r1].value === rs[r2].value) continue;
            for (let r3 = r2 + 1; r3 < rs.length; r3++) {
              if (rs[r3].type === rs[r1].type && rs[r3].value === rs[r1].value) continue;
              if (rs[r3].type === rs[r2].type && rs[r3].value === rs[r2].value) continue;
              const rows = [rs[r1], rs[r2], rs[r3]];
              const usedKeys = new Set(rows.map(clueKey));
              const colCandidates = cs.filter((c) => !usedKeys.has(clueKey(c)));
              for (let c1 = 0; c1 < colCandidates.length; c1++) {
                const col1 = colCandidates[c1];
                if (!rows.every((r) => intersectionHas(r, col1))) continue;
                for (let c2 = c1 + 1; c2 < colCandidates.length; c2++) {
                  const col2 = colCandidates[c2];
                  if (col2.type === col1.type && col2.value === col1.value) continue;
                  if (!rows.every((r) => intersectionHas(r, col2))) continue;
                  for (let c3 = c2 + 1; c3 < colCandidates.length; c3++) {
                    const col3 = colCandidates[c3];
                    if (col3.type === col1.type && col3.value === col1.value) continue;
                    if (col3.type === col2.type && col3.value === col2.value) continue;
                    if (!rows.every((r) => intersectionHas(r, col3))) continue;

                    const cols = [col1, col2, col3];
                    if (!passesDiversity(rows, cols)) continue;

                    const fp = await fingerprintFromClues(rows, cols);
                    if (recentFingerprints.has(fp)) continue; // hard reject

                    // Score: lower = better (more diverse, fresher)
                    const sig = structureSignature([...rows, ...cols]);
                    let score = 0;
                    score += (recentStructures.get(sig) ?? 0) * 3; // user has seen this structure
                    if (globallyHot.has(fp)) score += 5;
                    // Slight penalty for boards that lean heavy on a single type
                    const counts = clueTypeCounts([...rows, ...cols]);
                    const maxType = Math.max(...Object.values(counts));
                    score += Math.max(0, maxType - 2);

                    candidates.push({ rows, cols, fingerprint: fp, score });
                    if (candidates.length >= 15) break outer;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not assemble a fresh, diverse board" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    candidates.sort((a, b) => a.score - b.score);
    const chosen = candidates[0];

    await registerBoard(supabase, chosen.fingerprint, esport, chosen.rows, chosen.cols, userId);

    return new Response(
      JSON.stringify({
        rowClues: chosen.rows,
        colClues: chosen.cols,
        fingerprint: chosen.fingerprint,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function registerBoard(
  supabase: any,
  fingerprint: string,
  esport: string,
  rows: Clue[],
  cols: Clue[],
  userId: string | undefined,
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
