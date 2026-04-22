// Generates a 3x3 trivia board for a given esport.
// Picks 3 row clues + 3 column clues from {team, nationality} such that every
// (row,col) intersection has at least 1 active player satisfying both.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Clue = { type: "team" | "nationality"; value: string; label: string };

const NATIONALITY_LABELS: Record<string, string> = {
  US: "USA", RU: "Russia", BR: "Brazil", SE: "Sweden", CN: "China",
  UA: "Ukraine", AU: "Australia", PL: "Poland", DK: "Denmark", FI: "Finland",
  AR: "Argentina", DE: "Germany", FR: "France", GB: "UK", KR: "South Korea",
  CA: "Canada", NO: "Norway", NL: "Netherlands", ES: "Spain", TR: "Turkey",
  CZ: "Czechia", IT: "Italy", BE: "Belgium", PT: "Portugal", JP: "Japan",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { esport } = await req.json().catch(() => ({}));
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

    // Pull a generous candidate pool of active players for this esport
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

    // Aggregate counts
    const teamCount = new Map<string, { label: string; count: number }>();
    const nationCount = new Map<string, number>();
    for (const p of players) {
      const tid = String(p.current_team_id);
      const t = teamCount.get(tid);
      if (t) t.count++;
      else teamCount.set(tid, { label: p.current_team_name ?? "Unknown", count: 1 });
      nationCount.set(p.nationality, (nationCount.get(p.nationality) ?? 0) + 1);
    }

    // Build candidate clue pool: top 30 teams (≥3 players) and top 12 nationalities (≥4)
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

    // Build a set lookup for fast intersection checks
    // satisfies[playerId] = { teams:Set, nations:Set }
    const playerHas: { teamId: string; nation: string }[] = players.map((p) => ({
      teamId: String(p.current_team_id),
      nation: p.nationality,
    }));

    const satisfies = (clue: Clue, p: { teamId: string; nation: string }) =>
      clue.type === "team" ? p.teamId === clue.value : p.nation === clue.value;

    const intersectionHas = (a: Clue, b: Clue): boolean => {
      if (a.type === b.type && a.value === b.value) return false;
      for (const p of playerHas) {
        if (satisfies(a, p) && satisfies(b, p)) return true;
      }
      return false;
    };

    // Try to assemble a valid 3x3: rows = mix, cols = mix, ensure all 9 intersections solvable
    const shuffle = <T,>(arr: T[]) => arr.map((v) => [Math.random(), v] as const)
      .sort((a, b) => a[0] - b[0]).map(([, v]) => v);

    const buildBoard = (): { rows: Clue[]; cols: Clue[] } | null => {
      // Prefer rows = nations, cols = teams (most distinguishable). Fall back to mix.
      const layouts: Array<[Clue[], Clue[]]> = [
        [shuffle(nationPool), shuffle(teamPool)],
        [shuffle(teamPool), shuffle(nationPool)],
        [shuffle([...nationPool, ...teamPool]), shuffle([...nationPool, ...teamPool])],
      ];

      for (const [rowSrc, colSrc] of layouts) {
        for (let attempt = 0; attempt < 80; attempt++) {
          const rs = shuffle(rowSrc).slice(0, 12);
          const cs = shuffle(colSrc).slice(0, 12);
          // Greedy: pick 3 rows then 3 cols with valid intersections
          for (let r1 = 0; r1 < rs.length; r1++) {
            for (let r2 = r1 + 1; r2 < rs.length; r2++) {
              if (rs[r1].type === rs[r2].type && rs[r1].value === rs[r2].value) continue;
              for (let r3 = r2 + 1; r3 < rs.length; r3++) {
                if (rs[r3].type === rs[r1].type && rs[r3].value === rs[r1].value) continue;
                if (rs[r3].type === rs[r2].type && rs[r3].value === rs[r2].value) continue;
                const rows = [rs[r1], rs[r2], rs[r3]];
                const usedKeys = new Set(rows.map((r) => `${r.type}:${r.value}`));
                const colCandidates = cs.filter((c) => !usedKeys.has(`${c.type}:${c.value}`));
                // For each row, find cols that intersect
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
                      return { rows, cols: [col1, col2, col3] };
                    }
                  }
                }
              }
            }
          }
        }
      }
      return null;
    };

    const board = buildBoard();
    if (!board) {
      return new Response(
        JSON.stringify({ error: "Could not assemble a solvable board" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ rowClues: board.rows, colClues: board.cols }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
