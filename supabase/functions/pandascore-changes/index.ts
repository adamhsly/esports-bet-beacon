import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PANDA_API_TOKEN = Deno.env.get("PANDASCORE_API_TOKEN")!;
const BASE_URL = "https://api.pandascore.co/csgo/matches";

function extractKeyMatchData(match: any) {
  return {
    status: match.status,
    winner_id: match.winner_id,
    results: match.results?.map((r: any) => ({ team_id: r.team_id, score: r.score })) ?? [],
    opponents: match.opponents?.map((o: any) => o.opponent?.id).sort() ?? [],
    games: match.games?.map((g: any) => ({
      id: g.id,
      status: g.status,
      winner_id: g.winner?.id ?? null,
      end_at: g.end_at ?? null,
    })) ?? [],
  };
}

function isMatchChanged(remote: any, local: any): boolean {
  const a = extractKeyMatchData(remote);
  const b = extractKeyMatchData(local?.raw_data ?? {});
  return JSON.stringify(a) !== JSON.stringify(b);
}

async function fetchMatches(page = 1): Promise<any[]> {
  const res = await fetch(`${BASE_URL}?range[begin_at]=${new Date().toISOString().slice(0, 10)}T00:00:00Z,${new Date().toISOString().slice(0, 10)}T23:59:59Z&page=${page}&per_page=50`, {
    headers: {
      Authorization: `Bearer ${PANDA_API_TOKEN}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch matches", await res.text());
    return [];
  }

  return await res.json();
}

serve(async (_req) => {
  let page = 1;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const matches = await fetchMatches(page);
    if (!matches.length) break;

    for (const match of matches) {
      const { data: existing, error } = await supabase
        .from("pandascore_matches")
        .select("raw_data")
        .eq("id", match.id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching match ${match.id}`, error);
        continue;
      }

      if (existing && !isMatchChanged(match, existing)) {
        skipped++;
        continue;
      }

      const { error: upsertError } = await supabase.from("pandascore_matches").upsert({
        id: match.id,
        raw_data: match,
        begin_at: match.begin_at,
        status: match.status,
        name: match.name,
        modified_at: match.modified_at,
        start_time: match.begin_at,
        end_time: match.end_at,
      });

      if (upsertError) {
        console.error(`Error upserting match ${match.id}`, upsertError);
        continue;
      }

      updated++;
    }

    page++;
  }

  return new Response(
    JSON.stringify({ updated, skipped }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
