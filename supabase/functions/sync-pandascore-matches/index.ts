import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://deno.land/std/uuid/mod.ts";

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
    const res = await fetch("https://api.pandascore.co/lives", {
      headers: {
        Authorization: `Bearer ${PANDA_API_KEY}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(JSON.stringify({ error: "Failed to fetch live matches", details: err }), {
        status: 500,
      });
    }

    const lives = await res.json();

    const now = new Date().toISOString();

    const formatted = lives.map((match: any) => ({
      match_id: String(match.id),
      esport_type: match.videogame?.name || null,
      teams: match.opponents ? match.opponents.map((o: any) => o.opponent) : [],
      start_time: match.begin_at,
      end_time: match.end_at,
      tournament_id: match.tournament?.id?.toString() ?? null,
      tournament_name: match.tournament?.name ?? null,
      league_id: match.league?.id?.toString() ?? null,
      league_name: match.league?.name ?? null,
      serie_id: match.serie?.id?.toString() ?? null,
      serie_name: match.serie?.name ?? null,
      status: match.status,
      match_type: match.type,
      number_of_games: match.number_of_games ?? null,
      raw_data: match,
      updated_at: now,
      last_synced_at: now,
      slug: match.slug,
      draw: match.draw,
      forfeit: match.forfeit,
      original_scheduled_at: match.original_scheduled_at,
      rescheduled: match.rescheduled,
      detailed_stats: match.detailed_stats,
      winner_id: match.winner_id?.toString() ?? null,
      winner_type: match.winner_type ?? null,
      videogame_id: match.videogame?.id?.toString() ?? null,
      videogame_name: match.videogame?.name ?? null,
      stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
      stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
      modified_at: match.modified_at,
      team_a_player_ids: match.opponents?.[0]?.players?.map((p: any) => p.id) ?? [],
      team_b_player_ids: match.opponents?.[1]?.players?.map((p: any) => p.id) ?? [],
    }));

    // Upsert based on match_id, not uuid
    const { error } = await supabase
      .from("pandascore_matches")
      .upsert(formatted, { onConflict: "match_id" });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Insert failed", details: error }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, upserted: formatted.length }), {
      status: 200,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), {
      status: 500,
    });
  }
});
