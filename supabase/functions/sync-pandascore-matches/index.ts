import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return new Response(
        JSON.stringify({ error: "Failed to fetch live matches", details: err }),
        { status: 500 }
      );
    }

    const lives = await res.json();

    console.log("Pandascore live matches:", lives);

    const now = new Date().toISOString();

    // Filter out matches missing required fields: esport_type & start_time
    const filteredLives = lives.filter(
      (match: any) =>
        typeof match.videogame?.name === "string" &&
        match.videogame.name.trim() !== "" &&
        typeof match.begin_at === "string" &&
        match.begin_at.trim() !== ""
    );

    console.log(`Filtered out ${lives.length - filteredLives.length} invalid matches`);

    const formatted = filteredLives.map((match: any) => ({
      match_id: String(match.id),
      esport_type: match.videogame.name.trim(),
      teams: match.opponents ? match.opponents.map((o: any) => o.opponent) : [],
      start_time: new Date(match.begin_at).toISOString(),
      end_time: match.end_at ? new Date(match.end_at).toISOString() : null,
      tournament_id: match.tournament?.id?.toString() ?? null,
      tournament_name: match.tournament?.name ?? null,
      league_id: match.league?.id?.toString() ?? null,
      league_name: match.league?.name ?? null,
      serie_id: match.serie?.id?.toString() ?? null,
      serie_name: match.serie?.name ?? null,
      status: match.status || "scheduled",
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
    }));

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
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: err.message }),
      { status: 500 }
    );
  }
});
