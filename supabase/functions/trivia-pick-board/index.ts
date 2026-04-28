// Instant board picker: returns a random pre-baked board from the pool.
// No live generation, no heavy joins — just a single RPC call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClueType = "team" | "nationality" | "tournament" | "league" | "role" | "attribute";
type Clue = { type: ClueType; value: string; label: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { esport, userId } = await req.json().catch(() => ({}));
    if (!esport || typeof esport !== "string") {
      return json({ error: "esport required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("trivia_pick_baked_board", {
      _esport: esport,
      _user_id: userId ?? null,
      _recent_window: 10,
    });
    if (error) {
      return json({ error: `pick_rpc_failed: ${error.message}` }, 500);
    }
    const row = (data && data[0]) as
      | {
          fingerprint: string;
          row_clue_keys: string[];
          col_clue_keys: string[];
          clue_labels: Record<string, string> | null;
          quality_score: number | null;
          recognition_score: number | null;
        }
      | undefined;

    if (!row) {
      return json({
        error: "No pre-baked boards available for this esport. Ask an admin to bake the pool.",
        esport,
      }, 503);
    }

    const labels = row.clue_labels ?? {};
    const toClue = (k: string): Clue => {
      const [type, ...rest] = k.split(":");
      const value = rest.join(":");
      return {
        type: type as ClueType,
        value,
        label: labels[k] ?? value,
      };
    };
    const rowClues = (row.row_clue_keys ?? []).map(toClue);
    const colClues = (row.col_clue_keys ?? []).map(toClue);

    if (rowClues.length !== 3 || colClues.length !== 3) {
      return json({ error: "Selected board is malformed", fingerprint: row.fingerprint }, 500);
    }

    // Track that this user saw this board.
    if (userId) {
      try {
        const all = [...rowClues, ...colClues];
        const counts = all.reduce((acc: Record<string, number>, c) => {
          acc[c.type] = (acc[c.type] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const signature = Object.entries(counts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([t, n]) => `${t}:${n}`)
          .join(",");
        await supabase.rpc("trivia_register_board_use", {
          _fingerprint: row.fingerprint,
          _esport: esport,
          _structure_signature: signature,
          _clue_type_counts: counts,
          _row_clue_keys: row.row_clue_keys,
          _col_clue_keys: row.col_clue_keys,
          _user_id: userId,
        });
      } catch (_) { /* non-fatal */ }
    }

    return json({
      rowClues,
      colClues,
      fingerprint: row.fingerprint,
      quality: row.quality_score,
      recognition: row.recognition_score,
      source: "baked",
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
