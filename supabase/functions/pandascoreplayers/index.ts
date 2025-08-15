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
  const RATE_LIMIT_DELAY_MS = 3700; // ~3.7s for 1000 req/hr
  const CHECKPOINT_ID = "pandascore_players";

  try {
    // Get last checkpoint
    const { data: checkpointData, error: checkpointError } = await supabase
      .from("sync_checkpoints")
      .select("last_page")
      .eq("id", CHECKPOINT_ID)
      .single();

    if (checkpointError && checkpointError.code !== "PGRST116") {
      console.error("Error reading checkpoint", checkpointError);
      return new Response(JSON.stringify({ error: "Failed to read checkpoint" }), { status: 500 });
    }

    let page = checkpointData?.last_page ? checkpointData.last_page + 1 : 1;
    let totalUpserted = 0;

    while (true) {
      console.log(`📄 Fetching players page ${page}`);

      const response = await fetch(
        `https://api.pandascore.co/players?per_page=${PER_PAGE}&page=${page}`,
        {
          headers: { Authorization: `Bearer ${PANDA_API_KEY}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ PandaScore API error", response.status, errorData);
        break;
      }

      const players = await response.json();
      if (!players.length) {
        console.log("✅ No more players to fetch, sync complete");
        break;
      }

      const formatted = players.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        nationality: p.nationality ?? null,
        role: p.role ?? null, // NEW — role from API
        age: p.age ?? null,
        birthday: p.birthday ?? null,
        active: p.active ?? null,
        image_url: p.image_url ?? null,
        modified_at: p.modified_at ?? null,

        // Store entire objects
        current_team: p.current_team ?? null,
        current_videogame: p.current_videogame ?? null,

        // Flatten useful fields for quick search/filter
        current_team_id: p.current_team?.id ?? null,
        current_team_name: p.current_team?.name ?? null,
        current_team_slug: p.current_team?.slug ?? null,
        current_team_acronym: p.current_team?.acronym ?? null,
        current_team_location: p.current_team?.location ?? null,
        current_team_image_url: p.current_team?.image_url ?? null,
        videogame_id: p.current_videogame?.id ?? null,
        videogame_name: p.current_videogame?.name ?? null,
      }));

      // Upsert directly — will update existing or insert new
      const { error: upsertError } = await supabase
        .from("pandascore_players_master")
        .upsert(formatted, { onConflict: "id" });

      if (upsertError) {
        console.error("❌ Supabase upsert error", upsertError);
        return new Response(
          JSON.stringify({ error: "Database upsert failed", details: upsertError }),
          { status: 500 }
        );
      }

      totalUpserted += formatted.length;
      console.log(`✅ Upserted ${formatted.length} players from page ${page}`);

      // Save checkpoint
      const { error: checkpointUpsertError } = await supabase
        .from("sync_checkpoints")
        .upsert({ id: CHECKPOINT_ID, last_page: page }, { onConflict: "id" });

      if (checkpointUpsertError) {
        console.error("❌ Failed to update checkpoint", checkpointUpsertError);
        break;
      }

      page++;
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    return new Response(JSON.stringify({ success: true, totalUpserted }), { status: 200 });
  } catch (err: any) {
    console.error("💥 Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: err.message }),
      { status: 500 }
    );
  }
});
