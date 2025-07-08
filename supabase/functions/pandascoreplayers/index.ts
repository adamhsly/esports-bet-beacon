// supabase/functions/pandascoreplayers.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANDA_API_KEY = Deno.env.get("PANDA_SCORE_API_KEY");

  if (!PANDA_API_KEY) {
    console.error("Missing Pandascore API key");
    return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
  }

  try {
    const response = await fetch("https://api.pandascore.co/players?per_page=50", {
      headers: {
        Authorization: `Bearer ${PANDA_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Pandascore API error", response.status, data);
      return new Response(JSON.stringify({ error: "Failed to fetch players", details: data }), {
        status: 500,
      });
    }

    const formatted = data.map((pandascore_players_master: any) => ({
      id: player.id,
      name: player.name,
      slug: player.slug,
      active: player.active,
      modified_at: player.modified_at,
      age: player.age ?? null,
      birthday: player.birthday ?? null,
      first_name: player.first_name,
      last_name: player.last_name,
      nationality: player.nationality,
      image_url: player.image_url ?? null,
      current_team_id: player.current_team?.id ?? null,
      current_team_name: player.current_team?.name ?? null,
      current_team_slug: player.current_team?.slug ?? null,
      current_team_acronym: player.current_team?.acronym ?? null,
      current_team_location: player.current_team?.location ?? null,
      current_team_image_url: player.current_team?.image_url ?? null,
      videogame_id: player.current_videogame?.id ?? null,
      videogame_name: player.current_videogame?.name ?? null,
    }));

    const { error } = await supabase.from("pandascore_players_master").upsert(formatted, { onConflict: "id" });

if (error) {
  console.error("Supabase insert error", error.message, error.details, error.hint);
  return new Response(
    JSON.stringify({
      error: "Database insert failed",
      message: error.message,
      details: error.details,
      hint: error.hint,
    }),
    { status: 500 }
  );
}


    return new Response(JSON.stringify({ success: true, inserted: formatted.length }), {
      status: 200,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), {
      status: 500,
    });
  }
});
