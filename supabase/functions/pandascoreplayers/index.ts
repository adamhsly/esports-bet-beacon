// supabase/functions/pandascoreplayers.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANDA_API_KEY = Deno.env.get("PANDA_SCORE_API_KEY");

  if (!PANDA_API_KEY) {
    console.error("Missing Pandascore API key");
    return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
  }

  const PER_PAGE = 100;
  const RATE_LIMIT_DELAY_MS = 3700; // ~3.7 seconds to respect 1000 req/hr limit

  let page = 1;
  let totalInserted = 0;

  try {
    while (true) {
      console.log(`Fetching page ${page}`);

      const response = await fetch(
        `https://api.pandascore.co/players?per_page=${PER_PAGE}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${PANDA_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Pandascore API error", response.status, errorData);
        return new Response(
          JSON.stringify({ error: "Failed to fetch players", details: errorData }),
          { status: 500 }
        );
      }

      const data = await response.json();

      if (data.length === 0) {
        // No more players to fetch
        break;
      }

      const formatted = data.map((player: any) => ({
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

      const { error } = await supabase
        .from("pandascore_players_master")
        .upsert(formatted, { onConflict: "id" });

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

      totalInserted += formatted.length;
      console.log(`Inserted ${formatted.length} players from page ${page}`);

      page++;
      // Wait to respect rate limit
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    return new Response(
      JSON.stringify({ success: true, totalInserted }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: err.message }), {
      status: 500,
    });
  }
});
