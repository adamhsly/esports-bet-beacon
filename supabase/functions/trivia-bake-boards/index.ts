// Bake a batch of pre-generated trivia boards for an esport.
// Repeatedly invokes trivia-generate-board and lets it persist published
// boards into trivia_board_fingerprints (with clue_labels).
// Designed to be called in chunks (e.g. count: 10) from an admin "Bake more"
// button to avoid edge worker timeouts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const { esport, count = 5 } = await req.json().catch(() => ({}));
    if (!esport || typeof esport !== "string") {
      return json({ error: "esport required" }, 400);
    }
    const target = Math.max(1, Math.min(20, Number(count) || 5));

    const results: Array<{
      ok: boolean;
      fingerprint?: string;
      quality?: number;
      source?: string;
      error?: string;
      duplicate?: boolean;
    }> = [];

    const seen = new Set<string>();

    for (let i = 0; i < target; i++) {
      // Stop early if we're running long (Edge functions have a hard limit).
      if (Date.now() - t0 > 110_000) {
        results.push({ ok: false, error: "time_budget_exhausted" });
        break;
      }

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/trivia-generate-board`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({ esport }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          results.push({ ok: false, error: body?.error ?? `status_${resp.status}` });
          continue;
        }
        const fp = body?.fingerprint as string | undefined;
        if (!fp) {
          results.push({ ok: false, error: "no_fingerprint_in_response" });
          continue;
        }
        const dup = seen.has(fp);
        if (!dup) seen.add(fp);
        results.push({
          ok: true,
          fingerprint: fp,
          quality: body?.quality,
          source: body?.source,
          duplicate: dup,
        });
      } catch (e) {
        results.push({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const baked = results.filter((r) => r.ok && !r.duplicate && r.source === "generated").length;
    const duplicates = results.filter((r) => r.duplicate).length;
    const fallbacks = results.filter((r) => r.source === "fallback").length;
    const failed = results.filter((r) => !r.ok).length;

    return json({
      esport,
      attempts: results.length,
      baked,
      duplicates,
      fallbacks,
      failed,
      elapsedMs: Date.now() - t0,
      results,
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
