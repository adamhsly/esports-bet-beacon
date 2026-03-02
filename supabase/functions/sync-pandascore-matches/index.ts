import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_PAGES = 5; // Up to 500 results per endpoint (5 pages × 100 per page)

async function fetchAllPages(url: string, apiKey: string): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const separator = url.includes('?') ? '&' : '?';
    const pagedUrl = `${url}${separator}per_page=100&page=${page}`;
    const res = await fetch(pagedUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.warn(`Failed fetch page ${page} of ${url}: ${res.status}`);
      break;
    }
    const data = await res.json();
    all.push(...data);
    // If we got fewer than 100 results, there are no more pages
    if (data.length < 100) break;
  }
  return all;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANDA_API_KEY = Deno.env.get("PANDA_SCORE_API_KEY");

  if (!PANDA_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
  }

  try {
    const now = new Date().toISOString();
    let allFormatted: any[] = [];

    // 1. Fetch live matches (single page, no pagination needed)
    const livesRes = await fetch("https://api.pandascore.co/lives?per_page=100", {
      headers: { Authorization: `Bearer ${PANDA_API_KEY}` },
    });

    if (livesRes.ok) {
      const lives = await livesRes.json();
      console.log(`Fetched ${lives.length} live matches`);
      const formatted = formatMatches(lives, now);
      allFormatted.push(...formatted);
    } else {
      console.error("Failed to fetch live matches:", await livesRes.text());
    }

    // 2. Fetch past + upcoming matches with pagination for each game
    const gameEndpoints = ["csgo", "dota2", "lol", "valorant", "ow", "rl"];
    
    for (const game of gameEndpoints) {
      try {
        // Fetch recently finished matches (past 2 days) with pagination
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const pastUrl = `https://api.pandascore.co/${game}/matches/past?sort=-begin_at&filter[begin_at]=${twoDaysAgo},`;
        
        const pastMatches = await fetchAllPages(pastUrl, PANDA_API_KEY);
        console.log(`Fetched ${pastMatches.length} past ${game} matches`);
        allFormatted.push(...formatMatches(pastMatches, now));

        // Fetch upcoming matches with pagination
        const upcomingUrl = `https://api.pandascore.co/${game}/matches/upcoming?sort=begin_at`;
        
        const upcomingMatches = await fetchAllPages(upcomingUrl, PANDA_API_KEY);
        console.log(`Fetched ${upcomingMatches.length} upcoming ${game} matches`);
        allFormatted.push(...formatMatches(upcomingMatches, now));
      } catch (gameErr) {
        console.error(`Error fetching ${game} matches:`, gameErr);
      }
    }

    // 3. Recheck stale matches: matches past their start_time but still not_started/cancelled in our DB
    try {
      const { data: staleMatches } = await supabase
        .from("pandascore_matches")
        .select("match_id")
        .in("status", ["not_started", "cancelled", "canceled"])
        .lt("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // started 2+ hours ago
        .gt("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // within last 7 days
        .limit(200);

      if (staleMatches && staleMatches.length > 0) {
        console.log(`Rechecking ${staleMatches.length} stale matches individually`);
        let rechecked = 0;
        for (const stale of staleMatches) {
          try {
            const res = await fetch(`https://api.pandascore.co/matches/${stale.match_id}`, {
              headers: { Authorization: `Bearer ${PANDA_API_KEY}` },
            });
            if (res.ok) {
              const match = await res.json();
              if (match.status === 'finished' || match.winner_id) {
                const formatted = formatMatches([match], now);
                allFormatted.push(...formatted);
                rechecked++;
              }
            } else {
              await res.text(); // consume body
            }
          } catch (e) {
            console.warn(`Failed to recheck match ${stale.match_id}:`, e);
          }
        }
        console.log(`Rechecked ${rechecked} stale matches with updated results`);
      }
    } catch (staleErr) {
      console.error("Error rechecking stale matches:", staleErr);
    }

    // Deduplicate by match_id (prefer most recent data)
    const matchMap = new Map<string, any>();
    for (const m of allFormatted) {
      matchMap.set(m.match_id, m);
    }
    const deduplicated = Array.from(matchMap.values());

    console.log(`Total unique matches to upsert: ${deduplicated.length}`);

    if (deduplicated.length === 0) {
      return new Response(JSON.stringify({ success: true, upserted: 0 }), { status: 200 });
    }

    // Batch upsert in chunks of 100
    let totalUpserted = 0;
    for (let i = 0; i < deduplicated.length; i += 100) {
      const chunk = deduplicated.slice(i, i + 100);
      const { error } = await supabase
        .from("pandascore_matches")
        .upsert(chunk, { onConflict: "match_id" });

      if (error) {
        console.error("Insert error for chunk:", error);
      } else {
        totalUpserted += chunk.length;
      }
    }

    return new Response(JSON.stringify({ success: true, upserted: totalUpserted }), {
      status: 200,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: err.message }),
      { status: 500 }
    );
  }
});

function formatMatches(matches: any[], now: string): any[] {
  const filtered = matches.filter(
    (match: any) =>
      typeof match.videogame?.name === "string" &&
      match.videogame.name.trim() !== "" &&
      typeof match.begin_at === "string" &&
      match.begin_at.trim() !== ""
  );

  return filtered.map((match: any) => {
    const effectiveStatus = (match.status === 'canceled' || match.status === 'cancelled') && match.winner_id
      ? 'finished'
      : match.status || 'scheduled';

    return {
      match_id: String(match.id),
      esport_type: match.videogame.name.trim(),
      teams: match.opponents ?? [],
      start_time: new Date(match.begin_at).toISOString(),
      end_time: match.end_at ? new Date(match.end_at).toISOString() : null,
      tournament_id: match.tournament?.id?.toString() ?? null,
      tournament_name: match.tournament?.name ?? null,
      league_id: match.league?.id?.toString() ?? null,
      league_name: match.league?.name ?? null,
      serie_id: match.serie?.id?.toString() ?? null,
      serie_name: match.serie?.name ?? null,
      status: effectiveStatus,
      match_type: match.type ?? null,
      number_of_games: match.number_of_games ?? 3,
      raw_data: match,
      updated_at: now,
      last_synced_at: now,
      slug: match.slug ?? null,
      draw: match.draw ?? null,
      forfeit: match.forfeit ?? null,
      original_scheduled_at: match.original_scheduled_at
        ? new Date(match.original_scheduled_at).toISOString()
        : null,
      rescheduled: match.rescheduled ?? null,
      detailed_stats: match.detailed_stats ?? null,
      winner_id: match.winner_id?.toString() ?? null,
      winner_type: match.winner_type ?? null,
      videogame_id: match.videogame?.id?.toString() ?? null,
      videogame_name: match.videogame?.name ?? null,
      stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
      stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
      modified_at: match.modified_at ? new Date(match.modified_at).toISOString() : null,
      team_a_player_ids: match.opponents?.[0]?.players?.map((p: any) => p.id) ?? [],
      team_b_player_ids: match.opponents?.[1]?.players?.map((p: any) => p.id) ?? [],
    };
  });
}
